import { useOrderList } from "@/src/api/orders";
import OrderListItem from "@components/OrderListItem";
import type { Tables } from "@/src/database.types";
import { Stack } from "expo-router";
import { ActivityIndicator,  Text,  FlatList } from "react-native";
import { useEffect } from "react";
import { supabase } from "@/src/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";

type AdminOrder = Tables<"orders">;

export default function OrdersScreen() {

  // project-defined mock import usage (replaced by Supabase query data)
  // import ordersData from "@assets/data/orders";
  const { data: orders, isLoading, error } = useOrderList({ archived: false });

  const queryClient = useQueryClient();

  // Enable Realtime: Broadcast changes on this table to authorized subscribers.
  useEffect(() => {
    const orders = supabase
      .channel("custom-insert-channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["orders"] });
        },
      )
      .subscribe();

    return () => {
      orders.unsubscribe();
    };
  }, [queryClient]);


  if (isLoading) {
    return <ActivityIndicator />;
  }
  if (error) {
    return <Text>Failed to fetch</Text>;
  }

  return (
    <>
      <Stack.Screen options={{ title: "Active" }} />
      <FlatList<AdminOrder>
        data={orders}        
        renderItem={({ item }) => (
          <OrderListItem order={item} routeGroup="admin" />
        )}
        contentContainerStyle={{ gap: 10, padding: 10 }}
      />
    </>
  );
}
