import { Stack, router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
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
import { formatCurrencyZAR } from "@/src/lib/formatCurrency";

type OrderDetailsParams = {
  id?: string;
};

export default function OrderDetailScreen() {
  const queryClient = useQueryClient();
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
    const numericId = Number(idString);
    if (!Number.isFinite(numericId) || numericId <= 0) return;

    const orders = supabase
      .channel(`user-order-detail-${numericId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${numericId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["orders"] });
          queryClient.invalidateQueries({ queryKey: ["order", numericId] });
          refetch();
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          refetch();
        }
      });

    return () => {
      orders.unsubscribe();
    };
  }, [idString, queryClient, refetch]);

  
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

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Order summary */}
        <OrderListItem
          order={orderFetched}
          statusSubtext={formatCurrencyZAR(orderTotal)}
        />

        {/* Items in the order */}
        <View style={styles.listContent}>
          {orderItems.map((item) => (
            <PlacedOrderListItems key={item.id} item={item} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },

  scrollContent: {
    gap: 10,
    paddingBottom: 16,
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

  headerLink: {
    fontWeight: "600",
  },
});
