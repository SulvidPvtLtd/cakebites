import { Stack, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import OrderListItem from "@components/OrderListItem";
import { useHideFailedOrderForUser, useMyOrders, type UserOrderRow } from "@/src/api/orders";
import { useAuth } from "@/src/providers/AuthProvider";
import { supabase } from "@/src/lib/supabase";
import Colors from "@/src/constants/Colors";
import { useColorScheme } from "@/src/components/useColorScheme";

type UserOrder = UserOrderRow;

export default function OrdersScreen() {
  const { source } = useLocalSearchParams<{ source?: string }>();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id;
  const { mutateAsync: hideFailedOrder } = useHideFailedOrderForUser();
  const [deletingOrderId, setDeletingOrderId] = useState<number | null>(null);
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

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
      <Stack.Screen
        options={{
          title: "Orders",
          headerLeft:
            source === "profile"
              ? () => (
                  <Pressable onPress={() => router.push("/(user)/log-out")}>
                    <Text>Profile</Text>
                  </Pressable>
                )
              : undefined,
        }}
      />
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
            <View style={styles.row}>
              <OrderListItem
                order={item}
                paymentStatusLabel={isPaid ? "Paid" : "Unpaid"}
              />
              {item.status === "Payment failed" ? (
                <Pressable
                  disabled={deletingOrderId === item.id}
                  onPress={() => {
                    Alert.alert(
                      "Delete failed order",
                      "Remove this failed payment order from your list? Admin can still see it.",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Delete",
                          style: "destructive",
                          onPress: async () => {
                            try {
                              setDeletingOrderId(item.id);
                              await hideFailedOrder(item.id);
                            } catch (error) {
                              Alert.alert(
                                "Delete failed",
                                error instanceof Error ? error.message : "Could not delete failed order.",
                              );
                            } finally {
                              setDeletingOrderId(null);
                            }
                          },
                        },
                      ],
                    );
                  }}
                  style={[styles.deleteButton, { borderColor: theme.error }]}
                >
                  <Text style={[styles.deleteText, { color: theme.error }]}>
                    {deletingOrderId === item.id ? "Deleting..." : "Delete failed order"}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          );
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 8,
  },
  deleteButton: {
    alignSelf: "flex-end",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deleteText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
