import React, { useCallback, useEffect, useMemo, useState } from "react";
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

export default function PaymentWebViewScreen() {
  const params = useLocalSearchParams<{
    orderId?: string;
    transactionId?: string;
    redirectUrl?: string;
    gateway?: string;
  }>();

  const orderId = useMemo(() => Number(params.orderId), [params.orderId]);
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

      try {
        const parsed = new URL(url);
        const statusParam = parsed.searchParams.get("status");
        const transactionParam = parsed.searchParams.get("transactionId");
        const resolvedTransactionId = transactionParam || transactionId;

        let resolvedStatus = normalizePaymentStatus(statusParam);

        if (resolvedTransactionId) {
          const record = await fetchPaymentTransaction(resolvedTransactionId);
          const dbStatus = normalizePaymentStatus(record?.status);
          resolvedStatus = dbStatus ?? resolvedStatus;
        }

        if (resolvedTransactionId) {
          try {
            const { data } = await supabase.functions.invoke(
              "create-payment-checkout",
              {
                method: "GET",
                query: {
                  transactionId: resolvedTransactionId,
                  status: resolvedStatus ?? undefined,
                },
              },
            );
            if (data?.status) {
              resolvedStatus = normalizePaymentStatus(data.status) ?? resolvedStatus;
            }
          } catch {
            // ignore; fallback to current status
          }
        }

        if (resolvedStatus === "succeeded") {
          clearCart();
          showToast("Payment successful.", "success");
        } else if (resolvedStatus === "cancelled") {
          showToast("Payment cancelled.", "info");
        } else if (resolvedStatus === "failed") {
          showToast("Payment failed.", "error");
        } else {
          showToast("Payment status pending.", "info");
        }
      } catch (error) {
        showToast("Failed to verify payment.", "error");
      } finally {
        if (handledNavigation) {
          setIsHandlingReturn(false);
          return;
        }
        if (Number.isFinite(orderId) && orderId > 0) {
          router.replace(`/(user)/orders/${orderId}`);
        } else {
          router.replace("/(user)/orders");
        }
      }
    },
    [isHandlingReturn, orderId, router, showToast, transactionId],
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
        originWhitelist={["http://", "https://", "cakebites://*"]}
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
