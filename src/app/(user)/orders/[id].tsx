import { Stack, router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";

import { useOrderDetails } from "@/src/api/orders";
import OrderListItem from "@/src/components/OrderListItem";
import PlacedOrderListItems from "@/src/components/PlacedOrderListItems";
import Colors from "@/src/constants/Colors";
import { supabase } from "@/src/lib/supabase";
import { OrderItem } from "@/src/types";

type OrderDetailsParams = {
  id?: string;
};

export default function OrderDetailScreen() {
  const scheme = useColorScheme() ?? "light";
  const theme = Colors[scheme];
  const { id: idParam } = useLocalSearchParams<OrderDetailsParams>();
  const idString = typeof idParam === "string" ? idParam : idParam?.[0]; // Make sure id is a string.

  const { data: orderFetched, isLoading, error, refetch } = useOrderDetails(idString);

  // Notify the user once they've landed on the order details screen.
  useEffect(() => {
    if (!idString || !orderFetched) return;
    //Alert.alert("Paid Order!");
  }, [idString, orderFetched]);

  useEffect(() => {
    if (!idString) return;

    const orders = supabase
      .channel("custom-filter-channel")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${idString}`,
        },
        () => {
          refetch();
        },
      )
      .subscribe();

    return () => {
      orders.unsubscribe();
    };
  }, [idString, refetch]);

  
  if (!idString) {
    return (
      <View style={styles.centeredContainer}>
        <Stack.Screen options={{ title: "Invalid order" }} />
        <Text style={{ color: theme.textPrimary }}>Invalid order reference.</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centeredContainer}>
        <Stack.Screen options={{ title: "Loading order" }} />
        <ActivityIndicator color={theme.tint} />
      </View>
    );
  }

  if (error || !orderFetched) {
    return (
      <View style={styles.centeredContainer}>
        <Stack.Screen options={{ title: "Order not found" }} />
        <Text style={{ color: theme.textPrimary }}>Order not found.</Text>
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
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: `User Order #${idString}`,
          headerRight: () => (
            <Pressable onPress={() => router.replace("/(user)/orders")}>
              <Text style={[styles.headerLink, { color: theme.tint }]}>Order List</Text>
            </Pressable>
          ),
        }}
      />

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

  headerLink: {
    fontWeight: "600",
  },
});
