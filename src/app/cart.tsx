import { useCart } from '@providers/CartProvider';
import React, { useMemo } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@constants/Colors';

export default function CartScreen() {
  const { items, updateQuantity, removeItem } = useCart();

  const scheme = useColorScheme() ?? 'light';
  const theme = Colors[scheme];
  const insets = useSafeAreaInsets();

  const subtotal = useMemo(
    () =>
      items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [items]
  );

  /* ---------------- Empty State ---------------- */
  if (items.length === 0) {
    return (
      <View
        style={[styles.emptyContainer, { backgroundColor: theme.background }]}
      >
        <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
          Your cart is empty
        </Text>
        <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
          Add something delicious to get started.
        </Text>
      </View>
    );
  }

  /* ---------------- Main UI ---------------- */
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Scrollable list */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 160 + insets.bottom,
        }}
        renderItem={({ item }) => {
          const lineTotal = item.product.price * item.quantity;

          const isMinusDisabled = item.quantity <= 1;

          return (
            <View
              style={[
                styles.card,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              {/* Header */}
              <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.productName, { color: theme.textPrimary }]}
                  >
                    {item.product.name}
                  </Text>

                  <Text style={[styles.meta, { color: theme.textSecondary }]}>
                    Size {item.size}
                  </Text>
                </View>

                <Text style={[styles.lineTotal, { color: theme.textPrimary }]}>
                  ${lineTotal.toFixed(2)}
                </Text>
              </View>

              <View
                style={[styles.divider, { backgroundColor: theme.border }]}
              />

              {/* Controls */}
              <View style={styles.controlsRow}>
                <View style={styles.stepper}>
                  {/* MINUS */}
                  <Pressable
                    onPress={() =>
                      updateQuantity(
                        item.product_id,
                        item.size,
                        item.quantity - 1
                      )
                    }
                    disabled={isMinusDisabled}
                    style={[
                      styles.stepButton,
                      { backgroundColor: theme.tint },
                    ]}
                  >
                    <Text
                      style={[
                        styles.stepTextInverse,
                        isMinusDisabled && { opacity: 0.5 },
                      ]}
                    >
                      −
                    </Text>
                  </Pressable>

                  <Text
                    style={[styles.quantity, { color: theme.textPrimary }]}
                  >
                    {item.quantity}
                  </Text>

                  {/* PLUS */}
                  <Pressable
                    onPress={() =>
                      updateQuantity(
                        item.product_id,
                        item.size,
                        item.quantity + 1
                      )
                    }
                    style={[
                      styles.stepButton,
                      { backgroundColor: theme.tint },
                    ]}
                  >
                    <Text style={styles.stepTextInverse}>+</Text>
                  </Pressable>
                </View>

                <Pressable
                  onPress={() => removeItem(item.product_id, item.size)}
                >
                  <Text style={[styles.remove, { color: theme.error }]}>
                    Remove
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        }}
      />

      {/* Sticky checkout */}
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
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
            Subtotal
          </Text>

          <Text style={[styles.summaryValue, { color: theme.textPrimary }]}>
            ${subtotal.toFixed(2)}
          </Text>
        </View>

        <Pressable
          style={[styles.checkoutButton, { backgroundColor: theme.tint }]}
        >
          <Text style={styles.checkoutText}>Proceed to checkout</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  container: { flex: 1 },

  card: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
  },

  headerRow: {
    flexDirection: 'row',
    gap: 12,
  },

  productName: {
    fontSize: 16,
    fontWeight: '600',
  },

  meta: {
    fontSize: 13,
    marginTop: 2,
  },

  lineTotal: {
    fontSize: 15,
    fontWeight: '600',
  },

  divider: {
    height: 1,
    marginVertical: 12,
  },

  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  stepButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  stepTextInverse: {
    fontSize: 20,           // slightly larger for better tap target feel
    fontWeight: '700',
    color: '#FFFFFF',
  },

  quantity: {
    minWidth: 28,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
  },

  remove: {
    fontSize: 13,
    fontWeight: '500',
  },

  checkoutBar: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
  },

  emptySubtitle: {
    fontSize: 14,
  },
});