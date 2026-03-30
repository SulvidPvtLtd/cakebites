// src/app/Cart.tsx

import React from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useColorScheme,
  Alert,
} from 'react-native';

import Colors from '@constants/Colors';
import { useDeliveryQuote } from '@/src/api/delivery';
import { useCart } from '@providers/CartProvider';
import { useAuth } from "@/src/providers/AuthProvider";
import CartList from '@components/CartList';
import { formatCurrencyZAR } from "@/src/lib/formatCurrency";

export default function CartScreen() {
  const { items, total, getCheckoutDraft, fulfillmentOption } = useCart();
  const { session, profile } = useAuth();
  const router = useRouter();

  const scheme = useColorScheme() ?? 'light';
  const theme = Colors[scheme];
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

  /* ---------------- Empty State ---------------- */
  if (!Array.isArray(items) || items.length === 0) {
    return (
      <View
        style={[
          styles.emptyContainer,
          { backgroundColor: theme.background },
        ]}
      >
        <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
          Your cart is empty
        </Text>
        <Text
          style={[
            styles.emptySubtitle,
            { color: theme.textSecondary },
          ]}
        >
          Add something delicious to get started.
        </Text>
      </View>
    );
  }

  /* ---------------- Main UI ---------------- */
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Cart list */}
      <CartList />

      {/* Sticky checkout bar */}
      <View
        style={[
          styles.checkoutBar,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            paddingBottom: 16,
          },
        ]}
      >
        {/* Subtotal */}
        <View style={styles.summaryRow}>
          <Text
            style={[
              styles.summaryLabel,
              { color: theme.textSecondary },
            ]}
          >
            Subtotal
          </Text>

          <Text
            style={[
              styles.summaryValue,
              { color: theme.tint }, // ✅ BLUE, ALWAYS
            ]}
          >
            {formatCurrencyZAR(total)}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text
            style={[
              styles.summaryLabel,
              { color: theme.textSecondary },
            ]}
          >
            Fulfilment
          </Text>

          <Text
            style={[
              styles.summaryLabel,
              { color: theme.textPrimary, fontWeight: '600' },
            ]}
          >
            {fulfillmentOption === "DELIVERY"
              ? "Delivery"
              : fulfillmentOption === "COLLECTION"
                ? "Self collect"
                : "Not selected"}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text
            style={[
              styles.summaryLabel,
              { color: theme.textSecondary },
            ]}
          >
            Delivery fee
          </Text>

          <Text
            style={[
              styles.summaryLabel,
              { color: theme.textPrimary },
            ]}
          >
            {fulfillmentOption !== "DELIVERY"
              ? formatCurrencyZAR(0)
              : !session
                ? "Sign in required"
                : !deliveryAddress
                  ? "Add delivery address"
                  : isDeliveryQuoteLoading
                    ? "Calculating..."
                    : deliveryQuoteError
                      ? "Unavailable"
                      : formatCurrencyZAR(deliveryFee)}
          </Text>
        </View>

        {fulfillmentOption === "DELIVERY" && deliveryQuote && (
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
              Delivery distance
            </Text>

            <Text style={[styles.summaryLabel, { color: theme.textPrimary }]}>
              {deliveryQuote.distanceKm.toFixed(2)} km
            </Text>
          </View>
        )}

        <View style={styles.summaryRow}>
          <Text
            style={[
              styles.summaryValue,
              { color: theme.textPrimary },
            ]}
          >
            Total
          </Text>

          <Text
            style={[
              styles.summaryValue,
              { color: theme.tint },
            ]}
          >
            {formatCurrencyZAR(finalTotal)}
          </Text>
        </View>

        {/* Checkout */}
        <Pressable
          onPress={async () => {
            if (!fulfillmentOption) {
              Alert.alert(
                'Choose fulfilment first',
                'Go back to product and choose Delivery or Self collect before checkout.',
              );
              return;
            }

            try {
              if (fulfillmentOption === "DELIVERY") {
                if (!session) {
                  Alert.alert(
                    "Sign in required",
                    "Sign in and save your delivery address before checkout.",
                  );
                  return;
                }

                if (!deliveryAddress) {
                  Alert.alert(
                    "Delivery address required",
                    "Add your delivery address in your profile before checkout.",
                    [
                      {
                        text: "Cancel",
                        style: "cancel",
                      },
                      {
                        text: "OK",
                        onPress: () =>
                          router.push({
                            pathname: "/(user)/log-out",
                            params: { source: "checkout", returnTo: "/cart" },
                          }),
                      },
                    ],
                  );
                  return;
                }

                if (!deliveryQuote || deliveryQuoteError) {
                  Alert.alert(
                    "Delivery quote unavailable",
                    deliveryQuoteError instanceof Error
                      ? deliveryQuoteError.message
                      : "We could not calculate the delivery cost.",
                  );
                  return;
                }
              }

              getCheckoutDraft(deliveryFee, {
                distanceKm: deliveryQuote?.distanceKm,
                deliveryRate: deliveryQuote?.deliveryRate,
                collectionAddress: deliveryQuote?.collectionAddress,
                deliveryAddress: deliveryQuote?.deliveryAddress,
              });
              router.push("/payment");
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Checkout failed';
              Alert.alert('Checkout failed', message);
            }
          }}
          style={[
            styles.checkoutButton,
            { backgroundColor: theme.tint },
          ]}
        >
          <Text style={[styles.checkoutText, { color: theme.card }]}>
            Proceed to checkout
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ---------------- Styles ---------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 6,
  },

  emptySubtitle: {
    fontSize: 14,
  },

  checkoutBar: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  summaryLabel: {
    fontSize: 14,
  },

  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
  },

  checkoutButton: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkoutText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
