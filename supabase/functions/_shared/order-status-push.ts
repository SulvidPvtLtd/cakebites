import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_API_URL = "https://exp.host/--/api/v2/push/send";

type SupabaseAdminClient = ReturnType<typeof createClient>;

type NotifyOrderStatusChangeInput = {
  supabase: SupabaseAdminClient;
  orderId: number;
  nextStatus: string;
  previousStatus?: string | null;
};

const formatStatusForMessage = (status: string) => {
  const normalized = status.trim().toLowerCase();

  switch (normalized) {
    case "new":
      return "New";
    case "cooking":
      return "Cooking";
    case "delivering":
      return "Delivering";
    case "delivered":
      return "Delivered";
    case "cancelled":
      return "Cancelled";
    case "pending payment":
      return "Pending Payment";
    default:
      return status.trim();
  }
};

const getMessageBody = (orderId: number, status: string) => {
  const normalized = status.trim().toLowerCase();

  if (normalized === "new") {
    return `Order #${orderId} is confirmed and queued for preparation.`;
  }
  if (normalized === "cooking") {
    return `Order #${orderId} is now being prepared.`;
  }
  if (normalized === "delivering") {
    return `Order #${orderId} is out for delivery.`;
  }
  if (normalized === "delivered") {
    return `Order #${orderId} has been delivered. Enjoy!`;
  }
  if (normalized === "cancelled") {
    return `Order #${orderId} has been cancelled.`;
  }

  return `Order #${orderId} status changed to ${formatStatusForMessage(status)}.`;
};

const isExpoPushToken = (value: string) => /^ExponentPushToken\[[^\]]+\]$/.test(value);

export const notifyOrderStatusChange = async ({
  supabase,
  orderId,
  nextStatus,
  previousStatus,
}: NotifyOrderStatusChangeInput) => {
  if (!Number.isFinite(orderId) || orderId <= 0) {
    return { sent: false, reason: "invalid_order_id" as const };
  }

  const previousNormalized = previousStatus?.trim().toLowerCase();
  const nextNormalized = nextStatus.trim().toLowerCase();
  if (previousNormalized && previousNormalized === nextNormalized) {
    return { sent: false, reason: "status_unchanged" as const };
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, user_id, profiles!orders_user_id_fkey(expo_push_token)")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError || !order) {
    return { sent: false, reason: "order_not_found" as const };
  }

  const profile = order.profiles as { expo_push_token?: string | null } | null;
  const token = profile?.expo_push_token?.trim() ?? "";
  if (!token || !isExpoPushToken(token)) {
    return { sent: false, reason: "missing_push_token" as const };
  }

  const payload = {
    to: token,
    sound: "default",
    channelId: "order-status",
    title: "Order Status Updated",
    body: getMessageBody(orderId, nextStatus),
    data: {
      type: "ORDER_STATUS_CHANGED",
      orderId,
      status: formatStatusForMessage(nextStatus),
    },
  };

  const response = await fetch(EXPO_PUSH_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  if (!response.ok) {
    return {
      sent: false,
      reason: "expo_request_failed" as const,
      details: responseText,
    };
  }

  let parsed: unknown = null;
  try {
    parsed = responseText ? JSON.parse(responseText) : null;
  } catch {
    parsed = responseText;
  }

  const ticket = (parsed as { data?: { status?: string; details?: { error?: string } } })?.data;
  if (ticket?.status === "error" && ticket?.details?.error === "DeviceNotRegistered") {
    await supabase
      .from("profiles")
      .update({ expo_push_token: null })
      .eq("id", order.user_id ?? "");
  }

  return { sent: true, reason: "sent" as const };
};
