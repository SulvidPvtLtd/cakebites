import { useCallback, useMemo } from "react";
import { FlatList, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";

import orders from "@/assets/data/orders";
import OrderListItem from "@/src/components/OrderListItem";
import PlacedOrderListItems from "@/src/components/PlacedOrderListItems";

/* -------------------------------------------------- */
/* Strong domain typing derived from source data       */
/* -------------------------------------------------- */

type Order = (typeof orders)[number];
type OrderItems = NonNullable<Order["order_items"]>;
type OrderItem = OrderItems[number];

/* -------------------------------------------------- */
/* Screen                                             */
/* -------------------------------------------------- */

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

  /* -------------------------------------------------- */
  /* Defensive early exits                              */
  /* -------------------------------------------------- */

  if (!id) {
    return (
      <View style={{ padding: 10 }}>
        <Stack.Screen options={{ title: "Invalid order" }} />
        <Text>Invalid order reference.</Text>
      </View>
    );
  }

  if (!orderFetched) {
    return (
      <View style={{ padding: 10 }}>
        <Stack.Screen options={{ title: "Order not found" }} />
        <Text>Order not found.</Text>
      </View>
    );
  }

  /**
   * Normalize possibly undefined array → always safe for FlatList
   */
  const orderItems: OrderItems = orderFetched.order_items ?? [];

  /* -------------------------------------------------- */
  /* Optimised FlatList render function                 */
  /* -------------------------------------------------- */

  const renderPlacedItem = useCallback(
    ({ item }: { item: OrderItem }) => (
      <PlacedOrderListItems item={item} />
    ),
    []
  );

 
    /* -------------------------------------------------- */ 
    // UI
    /* -------------------------------------------------- */
 

  return (
    <View style={{ padding: 10, gap: 10 }}>
      <Stack.Screen options={{ title: `Order #${id}` }} />

      {/* Order summary */}
      <OrderListItem order={orderFetched} />

      {/* Items in the order */}
      <FlatList<OrderItem>
        data={orderItems}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderPlacedItem}
        contentContainerStyle={{ gap: 10 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
