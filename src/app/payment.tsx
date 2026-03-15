import React, { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

import Colors from "@constants/Colors";
import { useColorScheme } from "@components/useColorScheme";
import PaymentMethodSelector from "@components/PaymentMethodSelector";
import { useOrderDetails } from "@/src/api/orders";
import { usePaymentGateway } from "@/src/api/payments";
import type { PaymentGateway } from "@/src/types";
import { useToast } from "@/src/providers/ToastProvider";
import { useAuth } from "@/src/providers/AuthProvider";

export default function PaymentScreen() {
  const params = useLocalSearchParams<{ orderId?: string }>();
  const orderId = useMemo(() => Number(params.orderId), [params.orderId]);
  const isValidOrderId = Number.isFinite(orderId) && orderId > 0;

  const { data: order, isLoading, error } = useOrderDetails(
    isValidOrderId ? orderId : null,
  );
  const { createCheckout } = usePaymentGateway();
  const { session, loading: authLoading } = useAuth();
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway | null>("yoco");
  const { showToast } = useToast();
  const router = useRouter();

  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const insets = useSafeAreaInsets();

  const total = Number(order?.total ?? 0);

  if (!isValidOrderId) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Invalid order</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          We could not load payment for this order.
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Payment unavailable</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Please try again later.
        </Text>
      </View>
    );
  }

  const onPayPress = async () => {
    if (authLoading) {
      showToast("Checking your session…", "error");
      return;
    }

    if (!session) {
      showToast("Please sign in to continue.", "error");
      router.push("/(auth)/sign-in");
      return;
    }

    if (!selectedGateway) {
      showToast("Choose a payment method first.", "error");
      return;
    }

    try {
      console.log("[payment] Pay now pressed", {
        orderId,
        selectedGateway,
      });
      const response = await createCheckout.mutateAsync({
        orderId,
        gateway: selectedGateway,
      });

      console.log("[payment] Checkout response", response);
      router.push({
        pathname: "/payment-webview",
        params: {
          orderId: String(orderId),
          transactionId: response.transactionId,
          redirectUrl: response.redirectUrl,
          gateway: selectedGateway,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payment failed.";
      showToast(message, "error");
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          paddingBottom: insets.bottom + 20,
        },
      ]}
    >
      <View style={styles.section}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Choose a gateway</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          If a gateway is slow, switch instantly before you pay.
        </Text>
      </View>

      <PaymentMethodSelector
        selectedGateway={selectedGateway}
        onSelect={setSelectedGateway}
      />

      <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Order total</Text>
        <Text style={[styles.summaryValue, { color: theme.tint }]}>
          {Number.isFinite(total) ? `R${total.toFixed(2)}` : "R0.00"}
        </Text>
      </View>

      <Pressable
        style={[styles.payButton, { backgroundColor: theme.tint }]}
        onPress={onPayPress}
        disabled={authLoading || !session || createCheckout.isPending}
      >
        {createCheckout.isPending ? (
          <ActivityIndicator color={theme.card} />
        ) : (
          <Text style={[styles.payText, { color: theme.card }]}>
            {session ? "Pay now" : "Sign in to pay"}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  section: {
    gap: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
  },
  summaryCard: {
    marginTop: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  summaryLabel: {
    fontSize: 13,
  },
  summaryValue: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: "700",
  },
  payButton: {
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: "auto",
  },
  payText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
