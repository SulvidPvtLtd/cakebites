import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { WebView } from "react-native-webview";

import Colors from "@constants/Colors";
import { useColorScheme } from "@components/useColorScheme";
import { fetchPaymentTransaction, normalizePaymentStatus } from "@/src/api/payments";
import { useToast } from "@/src/providers/ToastProvider";
import { useAuth } from "@/src/providers/AuthProvider";
import { useCart } from "@/src/providers/CartProvider";
import { supabase } from "@/src/lib/supabase";

const wait = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const PAYMENT_RETURN_SEGMENT = "payment-return";

const parseReturnUrl = (url: string) => {
  const parsed = Linking.parse(url);
  const path = typeof parsed.path === "string" ? parsed.path.toLowerCase() : "";
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const isCustomSchemeReturn = url.startsWith("jaymimicakes://");
  const isPathReturn =
    normalizedPath === PAYMENT_RETURN_SEGMENT ||
    normalizedPath.endsWith(`/${PAYMENT_RETURN_SEGMENT}`);
  const status = typeof parsed.queryParams?.status === "string" ? parsed.queryParams.status : null;
  const transactionId =
    typeof parsed.queryParams?.transactionId === "string"
      ? parsed.queryParams.transactionId
      : null;

  const isReturnUrl = Boolean(
    isCustomSchemeReturn ||
      isPathReturn ||
      (status && transactionId && url.toLowerCase().includes(PAYMENT_RETURN_SEGMENT)),
  );

  return {
    isReturnUrl,
    status,
    transactionId,
  };
};

export default function PaymentWebViewScreen() {
  const params = useLocalSearchParams<{
    transactionId?: string;
    redirectUrl?: string;
    gateway?: string;
  }>();

  const transactionId = params.transactionId ?? "";
  const redirectUrl = params.redirectUrl ?? "";
  const router = useRouter();
  const { showToast } = useToast();
  const [isHandlingReturn, setIsHandlingReturn] = useState(false);
  const isHandlingReturnRef = useRef(false);
  const { clearCart } = useCart();
  const { session, loading: authLoading } = useAuth();

  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const handleReturnUrl = useCallback(
    async (url: string) => {
      if (isHandlingReturnRef.current) return;
      isHandlingReturnRef.current = true;
      setIsHandlingReturn(true);
      let resolvedOrderId: number | null = null;
      let resolvedTransactionId = transactionId;
      let redirectTarget: `/(user)/orders/${number}` | "/(user)/orders" | "/cart" = "/(user)/orders";

      try {
        const parsedReturn = parseReturnUrl(url);
        const statusParam = parsedReturn.status;
        const transactionParam = parsedReturn.transactionId;
        // console.log("[payment] return params", {
        //   status: statusParam,
        //   transactionId: transactionParam ?? transactionId ?? null,
        // });
        resolvedTransactionId = transactionParam || transactionId;

        const statusFromReturn = normalizePaymentStatus(statusParam);
        let resolvedStatus: ReturnType<typeof normalizePaymentStatus> = null;

        if (resolvedTransactionId) {
          try {
            const queryParams = new URLSearchParams({
              transactionId: resolvedTransactionId,
              ...(statusFromReturn ? { status: statusFromReturn } : {}),
            });
            const { data } = await supabase.functions.invoke(
              `create-payment-checkout?${queryParams.toString()}`,
              { method: "GET" },
            );
            if (data) {
              resolvedStatus =
                normalizePaymentStatus(data.status) ?? resolvedStatus;
              resolvedOrderId =
                typeof data.orderId === "number" && Number.isFinite(data.orderId)
                  ? data.orderId
                  : resolvedOrderId;
            }
          } catch {
            // ignore; fallback to current status
          }
        }

        if (!resolvedStatus && resolvedTransactionId) {
          for (let attempt = 0; attempt < 4; attempt += 1) {
            await wait(1500);
            const record = await fetchPaymentTransaction(resolvedTransactionId);
            resolvedStatus = normalizePaymentStatus(record?.status);
            if (resolvedStatus && resolvedStatus !== "created" && resolvedStatus !== "pending") {
              break;
            }
          }
        }

        if (resolvedStatus === "succeeded") {
          clearCart();
          showToast("Payment successful.", "success");
          redirectTarget = "/(user)/orders";
        } else if (resolvedStatus === "cancelled") {
          showToast("Payment cancelled.", "info");
          redirectTarget = "/cart";
        } else if (resolvedStatus === "failed") {
          showToast("Payment failed.", "error");
          redirectTarget = "/cart";
        } else if (statusFromReturn === "cancelled") {
          showToast("Payment cancellation is pending confirmation.", "info");
          redirectTarget = "/cart";
        } else if (statusFromReturn === "failed") {
          showToast("Payment failure is pending confirmation.", "info");
          redirectTarget = "/cart";
        } else {
          showToast("Payment confirmation is still pending.", "info");
          redirectTarget = "/(user)/orders";
        }
      } catch (error) {
        showToast("Failed to verify payment.", "error");
        redirectTarget = "/cart";
      } finally {
        if (resolvedTransactionId && !resolvedOrderId) {
          try {
            const record = await fetchPaymentTransaction(resolvedTransactionId);
            resolvedOrderId =
              typeof record?.order_id === "number" && Number.isFinite(record.order_id)
                ? record.order_id
                : null;
          } catch {
            // ignore
          }
        }
        if (resolvedOrderId && Number.isFinite(resolvedOrderId) && resolvedOrderId > 0) {
          router.replace(`/(user)/orders/${resolvedOrderId}`);
        } else {
          router.replace(redirectTarget);
        }
        isHandlingReturnRef.current = false;
        setIsHandlingReturn(false);
      }
    },
    [router, showToast, transactionId, clearCart],
  );

  const shouldStartLoad = useCallback(
    (request: { url: string }) => {
      const url = request.url;
      const parsedReturn = parseReturnUrl(url);
      if (parsedReturn.isReturnUrl) {
        void handleReturnUrl(url);
        return false;
      }
      return true;
    },
    [handleReturnUrl],
  );

  useEffect(() => {
    const subscription = Linking.addEventListener("url", ({ url }) => {
      if (parseReturnUrl(url).isReturnUrl) {
        void handleReturnUrl(url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [handleReturnUrl]);

  if (authLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>
          Sign in required
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Please sign in to continue to payment.
        </Text>
      </View>
    );
  }

  if (!redirectUrl) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Missing checkout</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          We could not launch the payment page.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <WebView
        source={{ uri: redirectUrl }}
        onShouldStartLoadWithRequest={shouldStartLoad}
        onNavigationStateChange={(navState) => {
          if (parseReturnUrl(navState.url).isReturnUrl) {
            void handleReturnUrl(navState.url);
          }
        }}
        originWhitelist={["http://", "https://", "jaymimicakes://*"]}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator />
          </View>
        )}
      />
      {isHandlingReturn ? (
        <View style={styles.overlay}>
          <ActivityIndicator color={theme.card} />
          <Text style={[styles.overlayText, { color: theme.card }]}>
            Confirming payment...
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  overlayText: {
    fontSize: 16,
    fontWeight: "600",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
  },
});
