import { View, Text, StyleSheet, Image, useColorScheme } from "react-native";
import React from "react";
import { OrderItem } from "../types";
import { getSafeImageUrl } from "./ProductListItem";
import { getProductSizePriceMap } from "../lib/sizePricing";
import Colors from "@/src/constants/Colors";
import { formatCurrencyZAR } from "@/src/lib/formatCurrency";

type OrderedItemListItemsProps = {
  item: OrderItem;
};

const PlacedOrderListItems = ({ item }: OrderedItemListItemsProps) => {
  const scheme = useColorScheme() ?? "light";
  const theme = Colors[scheme];
  const sizePriceMap = getProductSizePriceMap(item.products);
  const priceForSize = sizePriceMap[item.size] ?? item.products.price;

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Image
        source={{ uri: getSafeImageUrl(item.products.image) }}
        style={styles.image}
        resizeMode="contain"
      />
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>{item.products.name}</Text>
        <View style={styles.subtitleContainer}>
          <Text style={[styles.price, { color: theme.tint }]}>
            {formatCurrencyZAR(priceForSize)}
          </Text>
          <Text style={{ color: theme.textSecondary }}>Size: {item.size}</Text>
        </View>
      </View>
      <View style={styles.quantitySelector}>
        <Text style={[styles.quantity, { color: theme.textPrimary }]}>{item.quantity}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 5,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  image: {
    width: 75,
    aspectRatio: 1,
    alignSelf: "center",
    marginRight: 10,
  },
  title: {
    fontWeight: "500",
    fontSize: 16,
    marginBottom: 5,
  },
  subtitleContainer: {
    flexDirection: "row",
    gap: 5,
  },
  quantitySelector: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginVertical: 10,
  },
  quantity: {
    fontWeight: "500",
    fontSize: 18,
  },
  price: {
    fontWeight: "bold",
  },
});

export default PlacedOrderListItems;
