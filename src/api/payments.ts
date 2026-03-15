import { supabase } from "@/src/lib/supabase";
import type { PaymentGateway, PaymentStatus, PaymentTransaction } from "@/src/types";
import { useMutation } from "@tanstack/react-query";

const readJwtPayload = (
  token: string,
): { iss?: string; exp?: number; aud?: string | string[]; iat?: number } | null => {
  try {
    const [, payloadBase64] = token.split(".");
    if (!payloadBase64) return null;
    const normalized = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );
    return JSON.parse(atob(padded)) as {
      iss?: string;
      exp?: number;
      aud?: string | string[];
      iat?: number;
    };
  } catch {
    return null;
  }
};

const readJwtHeader = (
  token: string,
): { alg?: string; kid?: string; typ?: string } | null => {
  try {
    const [headerBase64] = token.split(".");
    if (!headerBase64) return null;
    const normalized = headerBase64.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );
    return JSON.parse(atob(padded)) as { alg?: string; kid?: string; typ?: string };
  } catch {
    return null;
  }
};

export type CreateCheckoutInput = {
  orderId: number;
  gateway: PaymentGateway;
};

export type CreateCheckoutResponse = {
  redirectUrl: string;
  transactionId: string;
};

export const fetchPaymentTransaction = async (
  transactionId: string,
): Promise<PaymentTransaction | null> => {
  if (!transactionId) return null;

  const { data, error } = await supabase
    .from("payment_transactions")
    .select("*")
    .eq("id", transactionId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? null;
};

export const normalizePaymentStatus = (status: unknown): PaymentStatus | null => {
  if (typeof status !== "string") return null;
  const normalized = status.trim().toLowerCase();

  switch (normalized) {
    case "created":
      return "created";
    case "pending":
      return "pending";
    case "succeeded":
    case "success":
      return "succeeded";
    case "failed":
      return "failed";
    case "cancelled":
    case "canceled":
      return "cancelled";
    default:
      return null;
  }
};

export const usePaymentGateway = () => {
  const createCheckout = useMutation<CreateCheckoutResponse, Error, CreateCheckoutInput>({
    async mutationFn({ orderId, gateway }) {
      if (!Number.isFinite(orderId) || orderId <= 0) {
        throw new Error("Invalid order id.");
      }

      console.log("[payments] createCheckout start", {
        orderId,
        gateway,
      });

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.log("[payments] getSession error", sessionError);
      }
      let session = sessionData?.session ?? null;
      if (session?.expires_at) {
        const secondsLeft = session.expires_at - Math.floor(Date.now() / 1000);
        if (secondsLeft < 60) {
          const { data: refreshData, error: refreshError } =
            await supabase.auth.refreshSession();
          if (refreshError) {
            console.log("[payments] refreshSession error", refreshError);
          }
          session = refreshData?.session ?? session;
        }
      }

      const accessToken = session?.access_token;
      console.log("[payments] access token present", Boolean(accessToken));
      if (!accessToken) {
        throw new Error("Please sign in to continue.");
      }
      const jwtHeader = readJwtHeader(accessToken);
      if (jwtHeader) {
        console.log("[payments] access token header", jwtHeader);
      }
      const jwtPayload = readJwtPayload(accessToken);
      if (jwtPayload?.iss) {
        console.log("[payments] access token issuer", jwtPayload.iss);
      }
      if (jwtPayload?.exp) {
        const secondsLeft = jwtPayload.exp - Math.floor(Date.now() / 1000);
        console.log("[payments] access token expires in (s)", secondsLeft);
      }
      if (jwtPayload?.aud) {
        console.log("[payments] access token audience", jwtPayload.aud);
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        console.log("[payments] getUser failed", userError);
        await supabase.auth.signOut({ scope: "local" });
        throw new Error("Session is invalid. Please sign in again.");
      }
      console.log("[payments] getUser ok", { id: userData.user.id });

      try {
        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
        const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
        if (supabaseUrl) {
          console.log("[payments] direct fetch headers", {
            hasAuthorization: true,
            hasApikey: Boolean(anonKey),
          });
          const response = await fetch(
            `${supabaseUrl}/functions/v1/create-payment-checkout`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
                ...(anonKey ? { apikey: anonKey } : {}),
              },
              body: JSON.stringify({ orderId: String(orderId), gateway }),
            },
          );
          const responseText = await response.text();
          console.log("[payments] direct fetch status", response.status);
          if (responseText) {
            try {
              console.log(
                "[payments] direct fetch body",
                JSON.parse(responseText),
              );
            } catch {
              console.log("[payments] direct fetch body", responseText);
            }
          }
        }
      } catch (directError) {
        console.log("[payments] direct fetch error", directError);
      }

      const { data, error } = await supabase.functions.invoke(
        "create-payment-checkout",
        {
          body: { orderId: String(orderId), gateway },
        },
      );

  if (error) {
        const response = (error as { context?: Response })?.context;
        if (response && typeof response.text === "function") {
          try {
            const responseText = await (response.clone?.() ?? response).text();
            if (responseText) {
              try {
                console.log(
                  "[payments] createCheckout error body",
                  JSON.parse(responseText),
                );
              } catch {
                console.log("[payments] createCheckout error body", responseText);
              }
            }
          } catch {
            // ignore
          }
        } else {
          const rawBody =
            (error as { context?: { body?: unknown; _bodyInit?: { _data?: unknown } } })
              ?.context?._bodyInit?._data ??
            (error as { context?: { body?: unknown } })?.context?.body ??
            null;
          if (rawBody) {
            try {
              const parsed =
                typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
              console.log("[payments] createCheckout error body", parsed);
            } catch {
              console.log("[payments] createCheckout error body", rawBody);
            }
          }
        }

        console.log("[payments] createCheckout error", {
          message: error.message,
          context: (error as { context?: unknown })?.context,
        });
        const context = (error as { context?: { body?: unknown; status?: number } })
          ?.context;
        const statusLabel = context?.status ? ` (${context.status})` : "";
        let message = error.message;

        if (context?.body) {
          try {
            const body =
              typeof context.body === "string"
                ? JSON.parse(context.body)
                : context.body;
            const bodyMessage =
              (body as { error?: string; details?: string })?.error ??
              (body as { message?: string })?.message;
            if (bodyMessage) {
              message = `${bodyMessage}${statusLabel}`;
            } else {
              message = `${JSON.stringify(body)}${statusLabel}`;
            }
          } catch {
            message = `${String(context.body)}${statusLabel}`;
          }
        }

        console.log("[payments] createCheckout parsed error message", message);
        throw new Error(message);
      }

      if (!data?.redirectUrl || !data?.transactionId) {
        console.log("[payments] createCheckout invalid response", data);
        throw new Error("Payment gateway response was invalid.");
      }

      console.log("[payments] createCheckout success", data);
      return data as CreateCheckoutResponse;
    },
  });

  const checkStatus = useMutation<PaymentTransaction | null, Error, string>({
    async mutationFn(transactionId) {
      return fetchPaymentTransaction(transactionId);
    },
  });

  return {
    createCheckout,
    checkStatus,
  };
};
