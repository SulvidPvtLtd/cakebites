import { Stack } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, FlatList, Text } from "react-native";
import OrderListItem from "@components/OrderListItem";
import { useMyOrders } from "@/src/api/orders";
import type { Tables } from "@/src/database.types";
import { useAuth } from "@/src/providers/AuthProvider";
import { supabase } from "@/src/lib/supabase";

type UserOrder = Tables<"orders">;

export default function OrdersScreen() {
  const { session } = useAuth();
  const userId = session?.user.id;

  const { data: orders, isLoading, error, refetch } = useMyOrders();
  const safeOrders = orders ?? [];

  useEffect(() => {
    if (!userId) return;

    const ordersChannel = supabase
      .channel("user-orders-list-channel")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          refetch();
        },
      )
      .subscribe();

    return () => {
      ordersChannel.unsubscribe();
    };
  }, [userId, refetch]);

    if (isLoading) {
      return <ActivityIndicator />;
    }
    if (error) {
      return <Text>Failed to fetch</Text>;
  }

  return (
    <>
      <Stack.Screen options={{ title: "Orders" }} />
      <FlatList<UserOrder>
        data={safeOrders}
        contentContainerStyle={{ gap: 10, padding: 10 }}
        renderItem={({ item }) => (
          <OrderListItem order={item} />
        )}
      />
    </>
  );
}
