import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, View } from "react-native";

import { useOrderDetails } from "@/src/api/orders";
import OrderListItem from "@/src/components/OrderListItem";
import PlacedOrderListItems from "@/src/components/PlacedOrderListItems";
import Colors from "@/src/constants/Colors";
import { OrderItem } from "@/src/types";

type OrderDetailsParams = {
  id?: string;
};

export default function OrderDetailScreen() {
  const { id: idParam } = useLocalSearchParams<OrderDetailsParams>();
  const idString = typeof idParam === "string" ? idParam : idParam?.[0]; // Make sure id is a string.

  const { data: orderFetched, isLoading, error } = useOrderDetails(idString);

  // Notify the user once they've landed on the order details screen.
  useEffect(() => {
    if (!idString || !orderFetched) return;
    //Alert.alert("Paid Order!");
  }, [idString, orderFetched]);

  
  if (!idString) {
    return (
      <View style={styles.centeredContainer}>
        <Stack.Screen options={{ title: "Invalid order" }} />
        <Text>Invalid order reference.</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centeredContainer}>
        <Stack.Screen options={{ title: "Loading order" }} />
        <ActivityIndicator />
      </View>
    );
  }

  if (error || !orderFetched) {
    return (
      <View style={styles.centeredContainer}>
        <Stack.Screen options={{ title: "Order not found" }} />
        <Text>Order not found.</Text>
      </View>
    );
  }

  /**
   * Normalize possibly undefined array -> always safe for FlatList
   */
  const orderItems: OrderItem[] = (orderFetched.order_items ?? []).flatMap(
    (item) => {
      if (!item.products) return [];
      return [
        {
          id: item.id,
          order_id: item.order_id,
          product_id: item.product_id,
          products: item.products,
          quantity: item.quantity ?? 0,
          size: item.size as OrderItem["size"],
        },
      ];
    },
  );

  const renderPlacedItem = ({ item }: { item: OrderItem }) => (
    <PlacedOrderListItems item={item} />
  );

  const orderTotal = Number(orderFetched.total ?? 0);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: `User Order #${idString}` }} />

      {/* Order summary */}
      <OrderListItem order={orderFetched} statusSubtext={`$${orderTotal.toFixed(2)}`} />

      {/* Items in the order */}
      <FlatList<OrderItem>
        data={orderItems}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderPlacedItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    gap: 10,
  },

  centeredContainer: {
    flex: 1,
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  listContent: {
    gap: 10,
  },

  statusSection: {
    marginTop: 20,
  },

  statusTitle: {
    fontWeight: "bold",
    fontSize: 16,
  },

  statusContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },

  statusChip: {
    borderWidth: 1,
    borderColor: Colors.light.tint,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "transparent",
  },

  statusChipActive: {
    backgroundColor: Colors.light.tint,
  },

  statusText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.tint,
  },

  statusTextActive: {
    color: "#fff",
  },
});
