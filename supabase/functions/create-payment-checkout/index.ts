import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "npm:zod@3.24.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({
  orderId: z.string().min(1),
  gateway: z.enum(["yoco", "payfast", "ozow"]),
});

type CheckoutResponse = {
  redirectUrl: string;
  transactionId: string;
};

// Note: touch to force redeploy after config/runtime updates.
const resolveOrderStatus = (
  status: string | null,
): "New" | "Cancelled" | null => {
  if (!status) return null;
  const normalized = status.toLowerCase();
  if (normalized === "succeeded" || normalized === "success") return "New";
  if (normalized === "failed" || normalized === "cancelled" || normalized === "canceled") {
    return "Cancelled";
  }
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const statusParam = url.searchParams.get("status");
      const transactionId = url.searchParams.get("transactionId");
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

      const nextOrderStatus = resolveOrderStatus(
        transaction.status ?? statusParam,
      );
      const orderId = (transaction.order_id as number | null) ?? null;

      if (nextOrderStatus && orderId) {
        await supabase
          .from("orders")
          .update({ status: nextOrderStatus })
          .eq("id", orderId)
          .eq("status", "Pending Payment");
      }

      if (nextOrderStatus === "New" && orderId) {
        await supabase
          .from("payment_transactions")
          .update({ status: "succeeded" })
          .eq("id", transaction.id);
      }

      if (nextOrderStatus && nextOrderStatus !== "New") {
        await supabase
          .from("payment_transactions")
          .update({ status: nextOrderStatus === "Cancelled" ? "cancelled" : "failed" })
          .eq("id", transaction.id);
      }

      return jsonResponse(200, { ok: true, status: transaction.status, orderId });
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
    const orderId = Number(body.orderId);

    const supabase = getSupabaseAdmin();
    if (!Number.isFinite(orderId) || orderId <= 0) {
      return jsonResponse(400, { error: "Invalid orderId." });
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return jsonResponse(404, { error: "Order not found." });
    }

    if (!order.user_id || order.user_id !== authData.user.id) {
      return jsonResponse(403, { error: "Not authorized to pay for this order." });
    }

    const total = Number(order.total);
    if (!Number.isFinite(total) || total <= 0) {
      return jsonResponse(400, { error: "Order total is invalid." });
    }

    if (order.status?.toLowerCase?.() === "cancelled") {
      return jsonResponse(400, { error: "Order is cancelled." });
    }

    const amount = Math.round(total * 100);
    const currency = "ZAR";
    const returnBaseUrl =
      Deno.env.get("PAYMENT_RETURN_URL") ?? "cakebites://payment-return";

    const { data: existing } = orderId
      ? await supabase
          .from("payment_transactions")
          .select("*")
          .eq("order_id", orderId)
          .eq("gateway", body.gateway)
          .in("status", ["created", "pending"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : { data: null };

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
        order_id: orderId,
        gateway: body.gateway,
        status: "created",
        amount,
        currency,
        metadata: {
          stage: "initiated",
          user_id: authData.user.id,
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
            orderId: orderId ?? null,
            transactionId: transactionSeed.id,
            userId: authData.user.id,
          },
        };

        const response = await fetch("https://payments.yoco.com/api/checkouts", {
          method: "POST",
          headers: {
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
            orderId,
            transactionId: transactionSeed.id,
          });
          await supabase
            .from("payment_transactions")
            .update({
              status: "failed",
              metadata: {
                error: errorBody,
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
            orderId,
            transactionId: transactionSeed.id,
            response: yocoCheckout,
          });
          await supabase
            .from("payment_transactions")
            .update({
              status: "failed",
              metadata: {
                error: "Invalid Yoco response.",
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
              redirectUrl,
              yocoResponse: yocoCheckout,
            },
          })
          .eq("id", transactionSeed.id)
          .select("*")
          .single();

        if (insertError || !transaction) {
          return jsonResponse(500, { error: insertError?.message ?? "Failed to save transaction." });
        }

        if (orderId) {
          await supabase
            .from("orders")
            .update({
              payment_gateway: "yoco",
              payment_transaction_id: transaction.id,
            })
            .eq("id", orderId);
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
