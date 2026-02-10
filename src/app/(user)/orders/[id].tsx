import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo } from "react";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";

import orders from "@/assets/data/orders";
import OrderListItem from "@/src/components/OrderListItem";
import PlacedOrderListItems from "@/src/components/PlacedOrderListItems";
import Colors from "@/src/constants/Colors";
import { OrderStatusList } from "@/src/types";

type Order = (typeof orders)[number];
type OrderItems = NonNullable<Order["order_items"]>;
type OrderItem = OrderItems[number];
type OrderStatus = (typeof OrderStatusList)[number];

export default function OrderDetailScreen() {
  /**
   * Route params are external input → always optional & unsafe.
   */
  const { id } = useLocalSearchParams<{ id?: string }>();

  /**
   * Memoised order lookup
   */
  const orderFetched: Order | undefined = useMemo(() => {
    if (!id) return undefined;
    return orders.find((order) => order.id.toString() === id);
  }, [id]);

  // No checkout alert here: these are historical/paid orders.

  /* -------------------------------------------------- */
  /* Defensive early exits                              */
  /* -------------------------------------------------- */

  if (!id) {
    return (
      <View style={styles.centeredContainer}>
        <Stack.Screen options={{ title: "Invalid order" }} />
        <Text>Invalid order reference.</Text>
      </View>
    );
  }

  if (!orderFetched) {
    return (
      <View style={styles.centeredContainer}>
        <Stack.Screen options={{ title: "Order not found" }} />
        <Text>Order not found.</Text>
      </View>
    );
  }

  /**
   * Normalize possibly undefined array → always safe for FlatList
   */
  const orderItems: OrderItems = orderFetched.order_items ?? [];

  const renderPlacedItem = useCallback(
    ({ item }: { item: OrderItem }) => <PlacedOrderListItems item={item} />,
    [],
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: `User Order #${id}` }} />

      {/* Order summary */}
      <OrderListItem order={orderFetched} />

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
