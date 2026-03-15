import { Stack } from "expo-router";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ActivityIndicator, FlatList, Text } from "react-native";
import OrderListItem from "@components/OrderListItem";
import { useMyOrders, type UserOrderRow } from "@/src/api/orders";
import type { Tables } from "@/src/database.types";
import { useAuth } from "@/src/providers/AuthProvider";
import { supabase } from "@/src/lib/supabase";

type UserOrder = UserOrderRow;

export default function OrdersScreen() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id;

  const { data: orders, isLoading, error, refetch } = useMyOrders();
  const safeOrders = orders ?? [];

  useEffect(() => {
    if (!userId) return;

    const ordersChannel = supabase
      .channel(`user-orders-list-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["orders"] });
          refetch();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["orders"] });
          refetch();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["orders"] });
          refetch();
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          refetch();
        }
      });

    return () => {
      ordersChannel.unsubscribe();
    };
  }, [queryClient, userId, refetch]);

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
        renderItem={({ item }) => {
          const paymentStatus = item.payment_transactions?.status;
          const normalizedStatus =
            typeof paymentStatus === "string" ? paymentStatus.trim().toLowerCase() : "";
          const isPaid =
            normalizedStatus === "succeeded" || normalizedStatus === "success";
          return (
            <OrderListItem
              order={item}
              paymentStatusLabel={isPaid ? "Paid" : "Unpaid"}
            />
          );
        }}
      />
    </>
  );
}
