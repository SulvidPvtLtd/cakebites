import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "npm:zod@3.24.1";
import { notifyOrderStatusChange } from "../_shared/order-status-push.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({
  transactionId: z.string().min(1),
  amount: z.number().int().positive().optional(),
  reason: z.string().min(3),
});

const jsonResponse = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

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

const getObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const getNumericMetadataValue = (
  metadata: Record<string, unknown> | null,
  key: string,
) => {
  const value = metadata?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
};

const appendRefundEntry = (
  metadata: Record<string, unknown> | null,
  entry: Record<string, unknown>,
) => {
  const existingEntries = Array.isArray(metadata?.refunds)
    ? metadata?.refunds.filter((value) => value && typeof value === "object")
    : [];

  return [...existingEntries, entry];
};

const cancelLinkedOrder = async (
  supabase: ReturnType<typeof getSupabaseAdmin>,
  transaction: {
    id: string;
    order_id: number | null;
  },
) => {
  if (!transaction.order_id) return null;

  const { data, error } = await supabase
    .from("orders")
    .update({
      status: "Cancelled",
      payment_gateway: "yoco",
      payment_transaction_id: transaction.id,
    })
    .eq("id", transaction.order_id)
    .in("status", ["Pending Payment", "New", "Cooking", "Delivering"])
    .select("id, status")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse(405, { error: "Method not allowed." });
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

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("group")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (profileError) {
      return jsonResponse(500, { error: profileError.message });
    }

    if ((profile?.group ?? "").trim().toLowerCase() !== "admin") {
      return jsonResponse(403, { error: "Only admins can issue refunds." });
    }

    const { data: transaction, error: transactionError } = await supabase
      .from("payment_transactions")
      .select("*")
      .eq("id", body.transactionId)
      .single();

    if (transactionError || !transaction) {
      return jsonResponse(404, {
        error: transactionError?.message ?? "Transaction not found.",
      });
    }

    if (transaction.gateway !== "yoco") {
      return jsonResponse(400, { error: "Refunds are only implemented for Yoco." });
    }

    if (!transaction.gateway_transaction_id) {
      return jsonResponse(400, { error: "Missing gateway transaction id." });
    }

    if ((transaction.status ?? "").trim().toLowerCase() !== "succeeded") {
      return jsonResponse(400, {
        error: "Only successful payment transactions can be refunded.",
      });
    }

    const metadata = getObject(transaction.metadata);
    const refundedAmountTotal = getNumericMetadataValue(
      metadata,
      "refundedAmountTotal",
    );
    const totalAmount = Number(transaction.amount ?? 0);
    const remainingRefundableAmount = Math.max(0, totalAmount - refundedAmountTotal);

    const amount = body.amount ?? remainingRefundableAmount;

    if (!Number.isFinite(amount) || amount <= 0) {
      return jsonResponse(400, { error: "Refund amount must be greater than zero." });
    }

    if (amount > remainingRefundableAmount) {
      return jsonResponse(400, {
        error: "Refund amount exceeds the remaining refundable amount.",
      });
    }

    const yocoSecretKey = Deno.env.get("YOCO_SECRET_KEY");
    if (!yocoSecretKey) {
      return jsonResponse(500, { error: "Missing YOCO_SECRET_KEY." });
    }

    const idempotencyKey = `refund:${transaction.id}:${refundedAmountTotal}:${amount}`;
    const response = await fetch(
      `https://payments.yoco.com/api/checkouts/${transaction.gateway_transaction_id}/refund`,
      {
        method: "POST",
        headers: {
          "Idempotency-Key": idempotencyKey,
          Authorization: `Bearer ${yocoSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount }),
      },
    );

    const responseText = await response.text();
    let responseBody: Record<string, unknown> | string | null = null;
    if (responseText) {
      try {
        responseBody = JSON.parse(responseText) as Record<string, unknown>;
      } catch {
        responseBody = responseText;
      }
    }

    if (!response.ok) {
      return jsonResponse(response.status, {
        error: "Refund request failed.",
        details: responseBody,
      });
    }

    const responseObject = getObject(responseBody);
    const refundableAmount =
      typeof responseObject?.refundableAmount === "number" &&
      Number.isFinite(responseObject.refundableAmount)
        ? responseObject.refundableAmount
        : Math.max(0, remainingRefundableAmount - amount);
    const updatedRefundedAmountTotal = Math.max(0, totalAmount - refundableAmount);

    const refundEntry = {
      amount,
      idempotencyKey,
      createdAt: new Date().toISOString(),
      reason: body.reason.trim(),
      response: responseBody,
      requestedBy: authData.user.id,
      refundableAmount,
      status:
        typeof responseObject?.status === "string"
          ? responseObject.status
          : updatedRefundedAmountTotal >= totalAmount
            ? "succeeded"
            : "partial",
    };

    const nextMetadata = {
      ...(metadata ?? {}),
      refundedAmountTotal: updatedRefundedAmountTotal,
      refundableAmount,
      refundStatus:
        updatedRefundedAmountTotal >= totalAmount ? "refunded" : "partially_refunded",
      lastRefundAt: new Date().toISOString(),
      lastRefundAmount: amount,
      lastRefundIdempotencyKey: idempotencyKey,
      lastRefundReason: body.reason.trim(),
      refunds: appendRefundEntry(metadata, refundEntry),
    };

    const { error: updateError } = await supabase
      .from("payment_transactions")
      .update({
        metadata: nextMetadata,
      })
      .eq("id", transaction.id);

    if (updateError) {
      return jsonResponse(500, { error: updateError.message });
    }

    const archivedOrder = await cancelLinkedOrder(supabase, transaction);
    if (archivedOrder?.id) {
      await notifyOrderStatusChange({
        supabase,
        orderId: archivedOrder.id,
        nextStatus: "Cancelled",
      });
    }

    return jsonResponse(200, {
      ok: true,
      transactionId: transaction.id,
      amount,
      idempotencyKey,
      refundableAmount,
      refundStatus: nextMetadata.refundStatus,
      archivedOrderId: archivedOrder?.id ?? transaction.order_id ?? null,
      gatewayResponse: responseBody,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return jsonResponse(500, { error: message });
  }
});
