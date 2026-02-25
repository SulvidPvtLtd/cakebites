import React from "react";
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@constants/Colors";
import { useCart } from "@providers/CartProvider";
import { getSafeImageUrl } from "./ProductListItem";

const IMAGE_SIZE = 44;

export default function CartList() {
  const { items, updateQuantity, removeItem } = useCart();
  const insets = useSafeAreaInsets();

  const scheme = useColorScheme() ?? "light";
  const theme = Colors[scheme];

  if (!Array.isArray(items)) return null;

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
        if (!item?.product || !Number.isFinite(item.quantity)) {
          return null;
        }

        const quantity = Math.max(1, item.quantity);
        const unitPrice = Number(item.unitPrice) || 0;
        const lineTotal = unitPrice * quantity;

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
            <View style={styles.row}>
              <View
                style={[
                  styles.imageWrapper,
                  { backgroundColor: theme.placeholder },
                ]}
              >
                <Image
                  source={{ uri: getSafeImageUrl(item.product.image) }}
                  style={styles.image}
                  resizeMode="cover"
                />
              </View>

              <View style={styles.info}>
                <Text
                  style={[
                    styles.name,
                    { color: theme.textPrimary },
                  ]}
                  numberOfLines={1}
                >
                  {item.product.name}
                </Text>

                <Text style={[styles.meta, { color: theme.textSecondary }]} numberOfLines={1}>
                  ${unitPrice.toFixed(2)} · Size {item.size}
                </Text>
                <Text style={[styles.meta, { color: theme.textSecondary }]}>
                  Line total: ${lineTotal.toFixed(2)}
                </Text>
              </View>

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
                  <Text style={styles.stepText}>-</Text>
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
            </View>

            <Pressable
              onPress={() =>
                removeItem(item.product_id, item.size)
              }
              hitSlop={8}
            >
              <Text
                style={[
                  styles.remove,
                  { color: theme.error },
                ]}
              >
                Remove
              </Text>
            </Pressable>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
  },

  imageWrapper: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: IMAGE_SIZE / 2,
    marginRight: 12,
    backgroundColor: "#EAEAEA",
  },

  image: {
    width: "100%",
    height: "100%",
  },

  info: {
    flex: 1,
    marginRight: 8,
  },

  name: {
    fontSize: 14,
    fontWeight: "600",
  },

  meta: {
    fontSize: 12,
    marginTop: 2,
  },

  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  stepButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  stepText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },

  quantity: {
    minWidth: 20,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
  },

  remove: {
    fontSize: 12,
    marginTop: 8,
    fontWeight: "500",
  },
});

