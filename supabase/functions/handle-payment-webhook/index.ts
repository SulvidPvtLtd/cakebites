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

const mapYocoStatus = (eventType: string | undefined) => {
  if (!eventType) return "pending";
  const normalized = eventType.toLowerCase();

  if (normalized.includes("succeeded")) return "succeeded";
  if (normalized.includes("failed")) return "failed";
  if (normalized.includes("canceled") || normalized.includes("cancelled")) return "cancelled";
  return "pending";
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

      const payload = JSON.parse(rawBody);
      const eventType = payload?.type as string | undefined;
      const status = mapYocoStatus(eventType);
      const checkoutId =
        payload?.metadata?.checkoutId ??
        payload?.payment?.id ??
        payload?.data?.id ??
        null;

      if (!checkoutId) {
        return jsonResponse(400, { error: "Missing checkoutId in webhook payload." });
      }

      const supabase = getSupabaseAdmin();
      const { data: transaction, error: updateError } = await supabase
        .from("payment_transactions")
        .update({
          status,
          metadata: payload,
        })
        .eq("gateway", "yoco")
        .eq("gateway_transaction_id", checkoutId)
        .select("*")
        .single();

      if (updateError || !transaction) {
        return jsonResponse(404, { error: updateError?.message ?? "Transaction not found." });
      }

      const nextOrderStatus =
        status === "succeeded"
          ? "New"
          : status === "failed" || status === "cancelled"
            ? "Cancelled"
            : null;

      const orderId = (transaction.order_id as number | null) ?? null;
      if (orderId) {
        await supabase
          .from("orders")
          .update({
            payment_gateway: "yoco",
            payment_transaction_id: transaction.id,
            ...(nextOrderStatus ? { status: nextOrderStatus } : {}),
          })
          .eq("id", orderId);
      }

      return jsonResponse(200, { received: true });
    }

    // TODO: Implement Payfast webhook verification and processing.
    // TODO: Implement Ozow webhook verification and processing.

    return jsonResponse(400, { error: "Unknown webhook source." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return jsonResponse(500, { error: message });
  }
});
