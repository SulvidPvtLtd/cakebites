import React, { useCallback, useEffect, useState } from "react";
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
  const { clearCart } = useCart();
  const { session, loading: authLoading } = useAuth();

  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const returnBaseUrl = Linking.createURL("payment-return");

  const handleReturnUrl = useCallback(
    async (url: string) => {
      if (isHandlingReturn) return;
      setIsHandlingReturn(true);
      let handledNavigation = false;
      let resolvedOrderId: number | null = null;
      let resolvedTransactionId = transactionId;

      try {
        // console.log("[payment] return url", url);
        const parsed = new URL(url);
        const statusParam = parsed.searchParams.get("status");
        const transactionParam = parsed.searchParams.get("transactionId");
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
        } else if (resolvedStatus === "cancelled") {
          showToast("Payment cancelled.", "info");
        } else if (resolvedStatus === "failed") {
          showToast("Payment failed.", "error");
        } else if (statusFromReturn === "cancelled") {
          showToast("Payment cancellation is pending confirmation.", "info");
        } else if (statusFromReturn === "failed") {
          showToast("Payment failure is pending confirmation.", "info");
        } else {
          showToast("Payment confirmation is still pending.", "info");
        }
      } catch (error) {
        showToast("Failed to verify payment.", "error");
      } finally {
        if (handledNavigation) {
          setIsHandlingReturn(false);
          return;
        }
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
          router.replace("/(user)/orders");
        }
      }
    },
    [isHandlingReturn, router, showToast, transactionId, clearCart],
  );

  const shouldStartLoad = useCallback(
    (request: { url: string }) => {
      const url = request.url;
      if (url.startsWith(returnBaseUrl)) {
        void handleReturnUrl(url);
        return false;
      }
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        void handleReturnUrl(url);
        return false;
      }
      return true;
    },
    [handleReturnUrl, returnBaseUrl],
  );

  useEffect(() => {
    const subscription = Linking.addEventListener("url", ({ url }) => {
      if (url.startsWith(returnBaseUrl)) {
        void handleReturnUrl(url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [handleReturnUrl, returnBaseUrl]);

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
