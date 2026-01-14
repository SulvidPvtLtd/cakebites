// src/app/Cart.tsx

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@constants/Colors';
import { useCart } from '@providers/CartProvider';
import CartList from '@components/CartList';

export default function CartScreen() {
  const { items, total } = useCart();

  const scheme = useColorScheme() ?? 'light';
  const theme = Colors[scheme];
  const insets = useSafeAreaInsets();

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
            paddingBottom: insets.bottom + 16,
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
            $
            {Number.isFinite(total)
              ? total.toFixed(2)
              : '0.00'}
          </Text>
        </View>

        {/* Checkout */}
        <Pressable
          style={[
            styles.checkoutButton,
            { backgroundColor: theme.tint },
          ]}
        >
          <Text style={styles.checkoutText}>
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
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
