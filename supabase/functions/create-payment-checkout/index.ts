import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "npm:zod@3.24.1";
import { notifyOrderStatusChange } from "../_shared/order-status-push.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({
  gateway: z.enum(["yoco", "payfast", "ozow"]),
  draftOrder: z.object({
    total: z.number().positive(),
    delivery_option: z.enum(["Yes", "No"]),
    delivery_fee: z.number().nonnegative().optional(),
    delivery_distance_km: z.number().nonnegative().optional(),
    delivery_rate: z.number().nonnegative().optional(),
    collection_address: z.string().min(3).optional(),
    delivery_address: z.string().min(3).optional(),
    items: z.array(
      z.object({
        product_id: z.number().int().positive(),
        quantity: z.number().int().positive(),
        size: z.string().min(1),
        unitPrice: z.number().nonnegative(),
      }),
    ).min(1),
  }),
});

type CheckoutResponse = {
  redirectUrl: string;
  transactionId: string;
};

const normalizePaymentStatus = (
  status: string | null,
): "created" | "pending" | "succeeded" | "failed" | "cancelled" | null => {
  if (!status) return null;
  const normalized = status.trim().toLowerCase();
  if (normalized === "created") return "created";
  if (normalized === "pending") return "pending";
  if (normalized === "succeeded" || normalized === "success") return "succeeded";
  if (normalized === "failed") return "failed";
  if (normalized === "cancelled" || normalized === "canceled") return "cancelled";
  return null;
};

const resolveOrderStatus = (
  status: "created" | "pending" | "succeeded" | "failed" | "cancelled" | null,
): "New" | "Cancelled" | null => {
  if (status === "succeeded") return "New";
  if (status === "failed" || status === "cancelled") return "Cancelled";
  return null;
};

const getSupabaseAuthClient = (authHeader: string) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase public credentials.");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });
};

const getSupabaseAdmin = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Missing Supabase server credentials.");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });
};

const jsonResponse = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const buildReturnUrl = (base: string, status: string, transactionId?: string) => {
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const url = new URL(normalizedBase);
  url.searchParams.set("status", status);
  if (transactionId) {
    url.searchParams.set("transactionId", transactionId);
  }
  return url.toString();
};

const getObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const ensureOrderFromTransaction = async (
  supabase: ReturnType<typeof getSupabaseAdmin>,
  transaction: {
    id: string;
    order_id: number | null;
    metadata: unknown;
  },
  userId?: string | null,
) => {
  if (transaction.order_id) {
    return transaction.order_id;
  }

  const metadata = getObject(transaction.metadata);
  const draftOrder = getObject(metadata?.draftOrder);
  const draftItems = Array.isArray(draftOrder?.items) ? draftOrder.items : [];
  const total = Number(draftOrder?.total ?? 0);
  const deliveryOption = draftOrder?.delivery_option === "No" ? "No" : "Yes";
  const draftUserId =
    typeof metadata?.user_id === "string" ? metadata.user_id : userId ?? null;

  if (!draftUserId || !Number.isFinite(total) || total <= 0 || draftItems.length === 0) {
    throw new Error("Missing draft order metadata for successful payment.");
  }

  const { data: existingOrder } = await supabase
    .from("orders")
    .select("id")
    .eq("payment_transaction_id", transaction.id)
    .maybeSingle();

  if (existingOrder?.id) {
    return existingOrder.id;
  }

  const { data: newOrder, error: orderError } = await supabase
    .from("orders")
    .insert({
      total,
      status: "New",
      user_id: draftUserId,
      delivery_option: deliveryOption,
      payment_gateway: "yoco",
      payment_transaction_id: transaction.id,
    })
    .select("*")
    .single();

  if (orderError || !newOrder) {
    throw new Error(orderError?.message ?? "Failed to create order after payment.");
  }

  const orderItemsPayload = draftItems
    .map((item) => {
      const row = getObject(item);
      return {
        order_id: newOrder.id,
        product_id: Number(row?.product_id ?? 0),
        quantity: Number(row?.quantity ?? 0),
        size: typeof row?.size === "string" ? row.size : "",
      };
    })
    .filter(
      (item) =>
        Number.isFinite(item.product_id) &&
        item.product_id > 0 &&
        Number.isFinite(item.quantity) &&
        item.quantity > 0 &&
        item.size.length > 0,
    );

  if (orderItemsPayload.length === 0) {
    throw new Error("Draft order items were invalid.");
  }

  const { error: orderItemsError } = await supabase
    .from("order_items")
    .insert(orderItemsPayload);

  if (orderItemsError) {
    throw new Error(orderItemsError.message);
  }

  const { error: transactionUpdateError } = await supabase
    .from("payment_transactions")
    .update({ order_id: newOrder.id })
    .eq("id", transaction.id)
    .is("order_id", null);

  if (transactionUpdateError) {
    throw new Error(transactionUpdateError.message);
  }

  return newOrder.id;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const transactionId = url.searchParams.get("transactionId");
      const statusHint = normalizePaymentStatus(url.searchParams.get("status"));
      if (!transactionId) {
        return jsonResponse(400, { error: "Missing transactionId." });
      }

      const supabase = getSupabaseAdmin();
      const { data: transaction, error: transactionError } = await supabase
        .from("payment_transactions")
        .select("*")
        .eq("id", transactionId)
        .single();

      if (transactionError || !transaction) {
        return jsonResponse(404, { error: "Transaction not found." });
      }

      let resolvedTransactionStatus = normalizePaymentStatus(transaction.status);
      const transactionIsPending =
        resolvedTransactionStatus === "created" ||
        resolvedTransactionStatus === "pending";
      let resolvedOrderId =
        typeof transaction.order_id === "number" ? transaction.order_id : null;

      if (statusHint && transactionIsPending) {
        const nextOrderStatus = resolveOrderStatus(statusHint);
        const nextMetadata =
          transaction.metadata &&
          typeof transaction.metadata === "object" &&
          !Array.isArray(transaction.metadata)
            ? {
                ...(transaction.metadata as Record<string, unknown>),
                lastRedirectStatusHint: statusHint,
                lastRedirectHandledAt: new Date().toISOString(),
              }
            : {
                lastRedirectStatusHint: statusHint,
                lastRedirectHandledAt: new Date().toISOString(),
              };

        const { error: updateTransactionError } = await supabase
          .from("payment_transactions")
          .update({
            status: statusHint,
            metadata: nextMetadata,
          })
          .eq("id", transaction.id)
          .in("status", ["created", "pending"]);

        if (!updateTransactionError) {
          resolvedTransactionStatus = statusHint;
        }

        if (!updateTransactionError && nextOrderStatus === "New") {
          resolvedOrderId = await ensureOrderFromTransaction(supabase, transaction);
        }

        if (!updateTransactionError && nextOrderStatus && resolvedOrderId) {
          const { data: updatedOrder } = await supabase
            .from("orders")
            .update({ status: nextOrderStatus, payment_transaction_id: transaction.id })
            .eq("id", resolvedOrderId)
            .in("status", ["Pending Payment", "New"])
            .select("id")
            .maybeSingle();

          if (updatedOrder?.id) {
            await notifyOrderStatusChange({
              supabase,
              orderId: updatedOrder.id,
              nextStatus: nextOrderStatus,
            });
          }
        }
      }

      return jsonResponse(200, {
        ok: true,
        status: resolvedTransactionStatus ?? transaction.status,
        orderId: resolvedOrderId,
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse(401, { error: "Missing authorization header." });
    }

    const authClient = getSupabaseAuthClient(authHeader);
    const { data: authData, error: authError } = await authClient.auth.getUser();
    if (authError || !authData?.user) {
      return jsonResponse(401, { error: "Invalid or expired session." });
    }

    const body = BodySchema.parse(await req.json());

    const supabase = getSupabaseAdmin();
    const total = Number(body.draftOrder.total);
    if (!Number.isFinite(total) || total <= 0) {
      return jsonResponse(400, { error: "Draft order total is invalid." });
    }

    const amount = Math.round(total * 100);
    const currency = "ZAR";
    const returnBaseUrl =
      Deno.env.get("PAYMENT_RETURN_URL") ?? "jaymimicakes://payment-return";

    const { data: existing } = await supabase
      .from("payment_transactions")
      .select("*")
      .eq("gateway", body.gateway)
      .is("order_id", null)
      .in("status", ["created", "pending"])
      .contains("metadata", { user_id: authData.user.id })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.metadata && typeof existing.metadata === "object") {
      const existingRedirectUrl = (existing.metadata as Record<string, unknown>)
        .redirectUrl;
      if (typeof existingRedirectUrl === "string") {
        return jsonResponse(200, {
          redirectUrl: existingRedirectUrl,
          transactionId: existing.id,
        } satisfies CheckoutResponse);
      }
    }

    const { data: transactionSeed, error: seedError } = await supabase
      .from("payment_transactions")
      .insert({
        order_id: null,
        gateway: body.gateway,
        status: "created",
        amount,
        currency,
        metadata: {
          stage: "initiated",
          user_id: authData.user.id,
          draftOrder: body.draftOrder,
        },
      })
      .select("*")
      .single();

    if (seedError || !transactionSeed) {
      return jsonResponse(500, { error: seedError?.message ?? "Failed to create transaction." });
    }

    switch (body.gateway) {
      case "yoco": {
        const yocoSecretKey = Deno.env.get("YOCO_SECRET_KEY");
        if (!yocoSecretKey) {
          return jsonResponse(500, { error: "Missing YOCO_SECRET_KEY." });
        }

        const payload = {
          amount,
          currency,
          cancelUrl: buildReturnUrl(returnBaseUrl, "cancelled", transactionSeed.id),
          successUrl: buildReturnUrl(returnBaseUrl, "success", transactionSeed.id),
          failureUrl: buildReturnUrl(returnBaseUrl, "failed", transactionSeed.id),
          metadata: {
            transactionId: transactionSeed.id,
            userId: authData.user.id,
          },
        };

        const response = await fetch("https://payments.yoco.com/api/checkouts", {
          method: "POST",
          headers: {
            "Idempotency-Key": transactionSeed.id,
            "Content-Type": "application/json",
            Authorization: `Bearer ${yocoSecretKey}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error("Yoco checkout error", {
            status: response.status,
            body: errorBody,
            transactionId: transactionSeed.id,
          });
          await supabase
            .from("payment_transactions")
            .update({
            status: "failed",
            metadata: {
              error: errorBody,
              draftOrder: body.draftOrder,
              user_id: authData.user.id,
            },
          })
            .eq("id", transactionSeed.id);
          return jsonResponse(502, {
            error: "Failed to create Yoco checkout.",
            details: errorBody,
          });
        }

        const yocoCheckout = await response.json();
        const redirectUrl = yocoCheckout?.redirectUrl;
        const gatewayTransactionId = yocoCheckout?.id;

        if (!redirectUrl || !gatewayTransactionId) {
          console.error("Yoco checkout missing fields", {
            transactionId: transactionSeed.id,
            response: yocoCheckout,
          });
          await supabase
            .from("payment_transactions")
            .update({
              status: "failed",
              metadata: {
                error: "Invalid Yoco response.",
                draftOrder: body.draftOrder,
                user_id: authData.user.id,
              },
            })
            .eq("id", transactionSeed.id);
          return jsonResponse(502, { error: "Invalid Yoco response." });
        }

        const { data: transaction, error: insertError } = await supabase
          .from("payment_transactions")
          .update({
            gateway_transaction_id: gatewayTransactionId,
            metadata: {
              draftOrder: body.draftOrder,
              redirectUrl,
              user_id: authData.user.id,
              yocoResponse: yocoCheckout,
            },
          })
          .eq("id", transactionSeed.id)
          .select("*")
          .single();

        if (insertError || !transaction) {
          return jsonResponse(500, { error: insertError?.message ?? "Failed to save transaction." });
        }

        return jsonResponse(200, {
          redirectUrl,
          transactionId: transaction.id,
        } satisfies CheckoutResponse);
      }
      case "payfast": {
        // TODO: implement payfast checkout creation.
        await supabase
          .from("payment_transactions")
          .delete()
          .eq("id", transactionSeed.id);
        return jsonResponse(501, { error: "Payfast is not implemented yet." });
      }
      case "ozow": {
        // TODO: implement ozow checkout creation.
        await supabase
          .from("payment_transactions")
          .delete()
          .eq("id", transactionSeed.id);
        return jsonResponse(501, { error: "Ozow is not implemented yet." });
      }
      default:
        return jsonResponse(400, { error: "Unsupported gateway." });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    console.error("create-payment-checkout failed", { message, error });
    return jsonResponse(500, { error: message });
  }
});
