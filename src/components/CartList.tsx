// src/components/CartList.tsx

import React from 'react';
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
import { useCart } from '@providers/CartProvider';

export default function CartList() {
  const { items, updateQuantity, removeItem } = useCart();
  const insets = useSafeAreaInsets();

  const scheme = useColorScheme() ?? 'light';
  const theme = Colors[scheme];

  if (!Array.isArray(items)) {
    return null;
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        padding: 16,
        paddingBottom: 160 + insets.bottom,
      }}
      renderItem={({ item }) => {
        if (
          !item ||
          !item.product ||
          !Number.isFinite(item.quantity)
        ) {
          return null;
        }

        const price = Number(item.product.price) || 0;
        const quantity = Math.max(1, item.quantity);
        const lineTotal = price * quantity;

        return (
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
          >
            {/* Header */}
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.productName,
                    { color: theme.textPrimary },
                  ]}
                  numberOfLines={2}
                >
                  {item.product.name}
                </Text>

                <Text
                  style={[
                    styles.meta,
                    { color: theme.textSecondary },
                  ]}
                >
                  Size {item.size}
                </Text>
              </View>

              <Text
                style={[
                  styles.lineTotal,
                  { color: theme.textPrimary },
                ]}
              >
                ${lineTotal.toFixed(2)}
              </Text>
            </View>

            <View
              style={[
                styles.divider,
                { backgroundColor: theme.border },
              ]}
            />

            {/* Controls */}
            <View style={styles.controlsRow}>
              <View style={styles.stepper}>
                <Pressable
                  disabled={quantity <= 1}
                  onPress={() =>
                    updateQuantity(
                      item.product_id,
                      item.size,
                      quantity - 1
                    )
                  }
                  style={[
                    styles.stepButton,
                    { backgroundColor: theme.tint },
                  ]}
                >
                  <Text style={styles.stepText}>−</Text>
                </Pressable>

                <Text
                  style={[
                    styles.quantity,
                    { color: theme.textPrimary },
                  ]}
                >
                  {quantity}
                </Text>

                <Pressable
                  onPress={() =>
                    updateQuantity(
                      item.product_id,
                      item.size,
                      quantity + 1
                    )
                  }
                  style={[
                    styles.stepButton,
                    { backgroundColor: theme.tint },
                  ]}
                >
                  <Text style={styles.stepText}>+</Text>
                </Pressable>
              </View>

              <Pressable
                onPress={() =>
                  removeItem(item.product_id, item.size)
                }
              >
                <Text
                  style={[styles.remove, { color: theme.error }]}
                >
                  Remove
                </Text>
              </Pressable>
            </View>
          </View>
        );
      }}
    />
  );
}

/* ---------------- Styles ---------------- */

const styles = StyleSheet.create({
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

  stepText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
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
});
