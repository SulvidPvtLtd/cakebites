import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import Colors from "@constants/Colors";
import { useColorScheme } from "@components/useColorScheme";
import PaymentMethodSelector from "@components/PaymentMethodSelector";
import { useDeliveryQuote } from "@/src/api/delivery";
import { usePaymentGateway } from "@/src/api/payments";
import type { PaymentGateway } from "@/src/types";
import { useToast } from "@/src/providers/ToastProvider";
import { useAuth } from "@/src/providers/AuthProvider";
import { useCart } from "@/src/providers/CartProvider";
import { formatCurrencyZAR } from "@/src/lib/formatCurrency";

export default function PaymentScreen() {
  const { items, total, fulfillmentOption, getCheckoutDraft } = useCart();
  const { createCheckout } = usePaymentGateway();
  const { session, loading: authLoading, profile } = useAuth();
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway | null>("yoco");
  const { showToast } = useToast();
  const router = useRouter();

  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const deliveryAddress = profile?.delivery_address?.trim() ?? "";
  const {
    data: deliveryQuote,
    isLoading: isDeliveryQuoteLoading,
    error: deliveryQuoteError,
  } = useDeliveryQuote({
    enabled: fulfillmentOption === "DELIVERY",
    deliveryAddress,
  });
  const MIN_DELIVERY_FEE = 50;
  const rawDeliveryFee =
    fulfillmentOption === "DELIVERY" ? Number(deliveryQuote?.deliveryFee ?? 0) : 0;
  const deliveryFee =
    fulfillmentOption === "DELIVERY" && rawDeliveryFee > 0
      ? Math.max(rawDeliveryFee, MIN_DELIVERY_FEE)
      : rawDeliveryFee;
  const finalTotal = total + deliveryFee;
  const hasItems = Array.isArray(items) && items.length > 0;

  if (!hasItems) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Cart is empty</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Add items to your cart before payment.
        </Text>
      </View>
    );
  }
  if (!fulfillmentOption) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Fulfilment required</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Choose delivery or self collect before payment.
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

    if (fulfillmentOption === "DELIVERY") {
      if (!deliveryAddress) {
        showToast("Add your delivery address in profile before paying.", "error");
        return;
      }

      if (!deliveryQuote || deliveryQuoteError) {
        showToast(
          deliveryQuoteError instanceof Error
            ? deliveryQuoteError.message
            : "Delivery quote is unavailable.",
          "error",
        );
        return;
      }
    }

    try {
      const draftOrder = getCheckoutDraft(deliveryFee, {
        distanceKm: deliveryQuote?.distanceKm,
        deliveryRate: deliveryQuote?.deliveryRate,
        collectionAddress: deliveryQuote?.collectionAddress,
        deliveryAddress: deliveryQuote?.deliveryAddress,
      });
      console.log("[payment] Pay now pressed", {
        selectedGateway,
      });
      const response = await createCheckout.mutateAsync({
        gateway: selectedGateway,
        draftOrder,
      });

      console.log("[payment] Checkout response", response);
      router.push({
        pathname: "/payment-webview",
        params: {
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
          paddingBottom: 20,
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
        <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Subtotal</Text>
        <Text style={[styles.summaryMinorValue, { color: theme.textPrimary }]}>
          {formatCurrencyZAR(total)}
        </Text>
        <Text style={[styles.summaryLabel, { color: theme.textSecondary, marginTop: 12 }]}>
          Delivery
        </Text>
        <Text style={[styles.summaryMinorValue, { color: theme.textPrimary }]}>
          {fulfillmentOption !== "DELIVERY"
            ? formatCurrencyZAR(0)
            : !deliveryAddress
              ? "Add delivery address in profile"
              : isDeliveryQuoteLoading
                ? "Calculating..."
                : deliveryQuoteError
                  ? "Unavailable"
                  : `${formatCurrencyZAR(deliveryFee)} (${deliveryQuote?.distanceKm.toFixed(2)} km)`}
        </Text>
        <Text style={[styles.summaryLabel, { color: theme.textSecondary, marginTop: 12 }]}>
          Order total
        </Text>
        <Text style={[styles.summaryValue, { color: theme.tint }]}>
          {formatCurrencyZAR(finalTotal)}
        </Text>
      </View>

      <Pressable
        style={[styles.payButton, { backgroundColor: theme.tint }]}
        onPress={onPayPress}
        disabled={
          authLoading ||
          !session ||
          createCheckout.isPending ||
          (fulfillmentOption === "DELIVERY" &&
            (!deliveryAddress || isDeliveryQuoteLoading || !deliveryQuote || Boolean(deliveryQuoteError)))
        }
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
  summaryMinorValue: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "600",
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
