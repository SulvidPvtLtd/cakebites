import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

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

const getFulfillmentLocationId = async (
  supabase: ReturnType<typeof getSupabaseAdmin>,
): Promise<number | null> => {
  const { data } = await supabase
    .from("delivery_settings")
    .select("fulfillment_location_id")
    .eq("id", 1)
    .maybeSingle();

  return typeof data?.fulfillment_location_id === "number"
    ? data.fulfillment_location_id
    : null;
};

const reserveInventoryForOrder = async (
  supabase: ReturnType<typeof getSupabaseAdmin>,
  orderId: number,
) => {
  const fulfillmentLocationId = await getFulfillmentLocationId(supabase);
  const { error } = await supabase.rpc("reserve_inventory_for_order", {
    p_order_id: orderId,
    p_location_id: fulfillmentLocationId,
  });

  if (error) {
    console.error("Inventory reservation failed", {
      orderId,
      message: error.message,
    });
  }
};

const decodeBase64 = (value: string) =>
  Uint8Array.from(atob(value), (c) => c.charCodeAt(0));

const timingSafeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
};

const verifyYocoSignature = async (
  rawBody: string,
  headers: Headers,
): Promise<{ ok: boolean; reason?: string }> => {
  const webhookId = headers.get("webhook-id");
  const webhookTimestamp = headers.get("webhook-timestamp");
  const webhookSignature = headers.get("webhook-signature");

  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    return { ok: false, reason: "Missing Yoco webhook headers." };
  }

  const secret = Deno.env.get("YOCO_WEBHOOK_SECRET");
  if (!secret) {
    return { ok: false, reason: "Missing YOCO_WEBHOOK_SECRET." };
  }

  const [, base64Secret] = secret.split("_");
  if (!base64Secret) {
    return { ok: false, reason: "Invalid Yoco webhook secret format." };
  }

  const now = Math.floor(Date.now() / 1000);
  const timestamp = Number(webhookTimestamp);
  if (!Number.isFinite(timestamp)) {
    return { ok: false, reason: "Invalid webhook timestamp." };
  }

  if (Math.abs(now - timestamp) > 180) {
    return { ok: false, reason: "Webhook timestamp is outside tolerance window." };
  }

  const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`;
  const key = await crypto.subtle.importKey(
    "raw",
    decodeBase64(base64Secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signedContent),
  );
  const expectedSignature = btoa(
    String.fromCharCode(...new Uint8Array(signatureBytes)),
  );

  const signatures = webhookSignature
    .split(" ")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => entry.replace(/^v1,/, ""));

  const matched = signatures.some((signature) =>
    timingSafeEqual(signature, expectedSignature),
  );

  return matched ? { ok: true } : { ok: false, reason: "Invalid webhook signature." };
};

const normalizeEventType = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const normalizePaymentStatus = (value: unknown) => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "created") return "created" as const;
  if (normalized === "pending") return "pending" as const;
  if (normalized === "succeeded" || normalized === "success") {
    return "succeeded" as const;
  }
  if (normalized === "failed") return "failed" as const;
  if (normalized === "cancelled" || normalized === "canceled") {
    return "cancelled" as const;
  }
  return null;
};

const getObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const mapYocoStatus = (eventType: string) => {
  if (!eventType) return "pending" as const;
  if (eventType.includes("succeeded")) return "succeeded" as const;
  if (eventType.includes("failed")) return "failed" as const;
  if (eventType.includes("canceled") || eventType.includes("cancelled")) {
    return "cancelled" as const;
  }
  return "pending" as const;
};

const getStatusRank = (status: string | null | undefined) => {
  switch ((status ?? "").toLowerCase()) {
    case "created":
      return 0;
    case "pending":
      return 1;
    case "failed":
    case "cancelled":
      return 2;
    case "succeeded":
      return 3;
    default:
      return -1;
  }
};

const mergeMetadata = (
  current: unknown,
  patch: Record<string, unknown>,
): Record<string, unknown> => {
  const base =
    current && typeof current === "object" && !Array.isArray(current)
      ? { ...(current as Record<string, unknown>) }
      : {};

  return {
    ...base,
    ...patch,
  };
};

const ensureOrderFromTransaction = async (
  supabase: ReturnType<typeof getSupabaseAdmin>,
  transaction: {
    id: string;
    order_id: number | null;
    amount: number;
    metadata: unknown;
  },
) => {
  if (transaction.order_id) {
    return transaction.order_id;
  }

  const metadata = getObject(transaction.metadata);
  const draftOrder = getObject(metadata?.draftOrder);
  const draftItems = Array.isArray(draftOrder?.items) ? draftOrder.items : [];
  const total = Number(draftOrder?.total ?? transaction.amount / 100);
  const deliveryOption = draftOrder?.delivery_option === "No" ? "No" : "Yes";
  const userId = typeof metadata?.user_id === "string" ? metadata.user_id : null;

  if (!userId || !Number.isFinite(total) || total <= 0 || draftItems.length === 0) {
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
      user_id: userId,
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

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItemsPayload);

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  await reserveInventoryForOrder(supabase, newOrder.id);

  const { error: updateTransactionError } = await supabase
    .from("payment_transactions")
    .update({ order_id: newOrder.id })
    .eq("id", transaction.id)
    .is("order_id", null);

  if (updateTransactionError) {
    throw new Error(updateTransactionError.message);
  }

  return newOrder.id;
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
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.id ?? transaction.order_id;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    const headers = req.headers;

    const isYocoWebhook =
      headers.has("webhook-id") &&
      headers.has("webhook-timestamp") &&
      headers.has("webhook-signature");

    if (isYocoWebhook) {
      const verification = await verifyYocoSignature(rawBody, headers);
      if (!verification.ok) {
        return jsonResponse(400, { error: verification.reason });
      }

      const payload = JSON.parse(rawBody) as Record<string, unknown>;
      const eventPayload = getObject(payload?.payload);
      const metadata = getObject(eventPayload?.metadata);
      const eventType = normalizeEventType(payload?.type);
      const resourceType = normalizeEventType(eventPayload?.type);
      const status =
        normalizePaymentStatus(eventPayload?.status) ??
        mapYocoStatus(eventType);
      const refundableAmount =
        typeof eventPayload?.refundableAmount === "number" &&
        Number.isFinite(eventPayload.refundableAmount)
          ? eventPayload.refundableAmount
          : null;
      const failureReason =
        typeof eventPayload?.failureReason === "string"
          ? eventPayload.failureReason
          : null;
      const webhookEventId = headers.get("webhook-id");
      const gatewayCheckoutId =
        (typeof metadata?.checkoutId === "string" ? metadata.checkoutId : null) ??
        (typeof eventPayload?.checkoutId === "string" ? eventPayload.checkoutId : null);
      const localTransactionId =
        typeof metadata?.transactionId === "string" ? metadata.transactionId : null;

      if (!webhookEventId) {
        return jsonResponse(400, { error: "Missing webhook event id." });
      }

      if (!gatewayCheckoutId && !localTransactionId) {
        return jsonResponse(400, {
          error: "Missing payment identifiers in webhook payload.",
        });
      }

      const supabase = getSupabaseAdmin();
      let transaction = null;
      let transactionError = null;

      if (localTransactionId) {
        const response = await supabase
          .from("payment_transactions")
          .select("*")
          .eq("id", localTransactionId)
          .eq("gateway", "yoco")
          .maybeSingle();
        transaction = response.data;
        transactionError = response.error;
      }

      if (!transaction && gatewayCheckoutId) {
        const response = await supabase
          .from("payment_transactions")
          .select("*")
          .eq("gateway", "yoco")
          .eq("gateway_transaction_id", gatewayCheckoutId)
          .maybeSingle();
        transaction = response.data;
        transactionError = response.error;
      }

      if (transactionError) {
        return jsonResponse(500, {
          error:
            transactionError instanceof Error
              ? transactionError.message
              : String(transactionError),
        });
      }

      if (!transaction) {
        return jsonResponse(404, { error: "Transaction not found." });
      }

      const { data: insertedEvent, error: eventInsertError } = await supabase
        .from("payment_webhook_events")
        .insert({
          gateway: "yoco",
          gateway_event_id: webhookEventId,
          event_type: eventType || null,
          payment_transaction_id: transaction.id,
          payload,
        })
        .select("*")
        .maybeSingle();

      if (eventInsertError) {
        const duplicate =
          eventInsertError.code === "23505" ||
          eventInsertError.message.toLowerCase().includes("duplicate");
        if (duplicate) {
          return jsonResponse(200, { received: true, duplicate: true });
        }
        return jsonResponse(500, { error: eventInsertError.message });
      }

      const currentRank = getStatusRank(transaction.status);
      const nextRank = getStatusRank(status);
      const resolvedStatus =
        nextRank >= currentRank ? status : transaction.status;

      const nextOrderStatus =
        resourceType === "payment" && resolvedStatus === "succeeded"
          ? "New"
        : resourceType === "payment" &&
              (resolvedStatus === "failed" || resolvedStatus === "cancelled")
            ? "Cancelled"
        : resourceType === "refund" && status === "succeeded"
          ? "Cancelled"
            : null;

      const nextMetadata = mergeMetadata(transaction.metadata, {
        lastWebhookEventId: webhookEventId,
        lastWebhookEventType: eventType || null,
        lastWebhookResourceType: resourceType || null,
        lastWebhookStatus: status,
        lastWebhookReceivedAt: new Date().toISOString(),
        gatewayCheckoutId: gatewayCheckoutId ?? transaction.gateway_transaction_id,
        lastWebhookPayload: eventPayload ?? payload,
        ...(resourceType === "refund"
          ? {
              refundStatus: status,
              lastRefundWebhookAt: new Date().toISOString(),
              lastRefundFailureReason: failureReason,
              ...(refundableAmount !== null
                ? {
                    refundableAmount,
                    refundedAmountTotal: Math.max(
                      0,
                      transaction.amount - refundableAmount,
                    ),
                  }
                : {}),
            }
          : {}),
      });

      const { error: updateTransactionError } = await supabase
        .from("payment_transactions")
        .update({
          status: resolvedStatus,
          metadata: nextMetadata,
        })
        .eq("id", transaction.id);

      if (updateTransactionError) {
        await supabase
          .from("payment_webhook_events")
          .update({
            processing_error: updateTransactionError.message,
          })
          .eq("id", insertedEvent?.id ?? 0);
        return jsonResponse(500, { error: updateTransactionError.message });
      }

      let resolvedOrderId =
        typeof transaction.order_id === "number" ? transaction.order_id : null;
      if (nextOrderStatus === "New") {
        resolvedOrderId = await ensureOrderFromTransaction(supabase, transaction);
      } else if (nextOrderStatus === "Cancelled" && resourceType === "refund") {
        resolvedOrderId = await cancelLinkedOrder(supabase, transaction);
      }

      if (resolvedOrderId && nextOrderStatus) {
        const orderUpdate = supabase
          .from("orders")
          .update({
            payment_gateway: "yoco",
            payment_transaction_id: transaction.id,
            status: nextOrderStatus,
          })
          .eq("id", resolvedOrderId);

        if (nextOrderStatus === "Cancelled") {
          await orderUpdate.in("status", ["Pending Payment", "New"]);
        } else {
          await orderUpdate.eq("status", "Pending Payment");
        }
      }

      await supabase
        .from("payment_webhook_events")
        .update({
          processed_at: new Date().toISOString(),
          processing_error: null,
        })
        .eq("id", insertedEvent?.id ?? 0);

      return jsonResponse(200, {
        received: true,
        transactionId: transaction.id,
        status: resolvedStatus,
      });
    }

    // TODO: Implement Payfast webhook verification and processing.
    // TODO: Implement Ozow webhook verification and processing.

    return jsonResponse(400, { error: "Unknown webhook source." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return jsonResponse(500, { error: message });
  }
});
