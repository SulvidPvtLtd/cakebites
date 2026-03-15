import { Stack, router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  View,
  useColorScheme,
} from "react-native";

import { useOrderDetails, useUpdateOrderStatus } from "@/src/api/orders";
import OrderListItem from "@/src/components/OrderListItem";
import PlacedOrderListItems from "@/src/components/PlacedOrderListItems";
import Colors from "@/src/constants/Colors";
import { OrderItem, OrderStatusList } from "@/src/types";
import { supabase } from "@/src/lib/supabase";

export default function OrderDetailScreen() {
  const scheme = useColorScheme() ?? "light";
  const theme = Colors[scheme];
  const { id } = useLocalSearchParams<{ id?: string }>();
  const queryClient = useQueryClient();
  const { data: orderFetched, isLoading, error } = useOrderDetails(id);
  const { mutateAsync: updateOrderStatus, isPending: isUpdatingStatus } =
    useUpdateOrderStatus();

  const normalizeOrderStatus = (
    status: string,
  ): (typeof OrderStatusList)[number] | null => {
    const normalized = status.trim().toLowerCase();
    switch (normalized) {
      case "pending payment":
        return "Pending Payment";
      case "new":
        return "New";
      case "cooking":
        return "Cooking";
      case "delivering":
        return "Delivering";
      case "delivered":
        return "Delivered";
      case "cancelled":
        return "Cancelled";
      default:
        return null;
    }
  };

  const getStatusIndex = (status: string) => OrderStatusList.indexOf(status as (typeof OrderStatusList)[number]);
  const normalizedCurrentStatus = orderFetched
    ? normalizeOrderStatus(orderFetched.status)
    : null;

  const isStatusSelectable = useMemo(() => {
    if (!orderFetched) return () => false;

    return (nextStatus: (typeof OrderStatusList)[number]) => {
      const currentStatus = normalizeOrderStatus(orderFetched.status);
      if (!currentStatus) return false;
      if (currentStatus === "Pending Payment") return false;
      if (currentStatus === nextStatus) return false;
      if (currentStatus === "Delivered" || currentStatus === "Cancelled") return false;

      if (nextStatus === "Cancelled") {
        return currentStatus === "New" || currentStatus === "Cooking" || currentStatus === "Delivering";
      }

      const currentIndex = getStatusIndex(currentStatus);
      const nextIndex = getStatusIndex(nextStatus);
      return currentIndex >= 0 && nextIndex === currentIndex + 1;
    };
  }, [orderFetched]);

  useEffect(() => {
    if (!id) return;
    const numericId = Number(id);
    if (!Number.isFinite(numericId) || numericId <= 0) return;

    const orders = supabase
      .channel(`admin-order-detail-${numericId}`)
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
        },
      )
      .subscribe();

    return () => {
      orders.unsubscribe();
    };
  }, [id, queryClient]);

  if (!id) {
    return (
      <View style={{ padding: 10 }}>
        <Stack.Screen options={{ title: "Invalid order" }} />
        <Text style={{ color: theme.textPrimary }}>Invalid order reference.</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={{ padding: 10 }}>
        <Stack.Screen options={{ title: "Loading order" }} />
        <ActivityIndicator color={theme.tint} />
      </View>
    );
  }

  if (error || !orderFetched) {
    return (
      <View style={{ padding: 10 }}>
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

  const renderPlacedItem = ({ item }: { item: OrderItem }) => (
    <PlacedOrderListItems item={item} />
  );

  const orderTotal = Number(orderFetched.total ?? 0);
  const customerEmail = orderFetched.profiles?.email ?? "Not available";
  const customerMobile = orderFetched.profiles?.mobile_number ?? "+27 XX XXX XXXX";

  return (
    <View style={{ padding: 10, gap: 10, backgroundColor: theme.background, flex: 1 }}>
      <Stack.Screen
        options={{
          title: `Admin Order #${id}`,
          headerRight: () => (
            <Pressable onPress={() => router.replace("/(admin)/orders/list")}>
              <Text style={{ color: theme.tint, fontWeight: "600" }}>
                Order List
              </Text>
            </Pressable>
          ),
        }}
      />

      {/* Order summary */}
      <OrderListItem
        order={orderFetched}
        routeGroup="admin"
        statusSubtext={`$${orderTotal.toFixed(2)}`}
        customerEmail={customerEmail}
        customerMobile={customerMobile}
      />

      {/* Items in the order */}
      <FlatList<OrderItem>
        data={orderItems}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderPlacedItem}
        contentContainerStyle={{ gap: 10 }}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={() => (
          <>
            <Text style={{ fontWeight: "bold" }}>Status</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 5, paddingVertical: 10 }}
            >
              {OrderStatusList.map((status) => (
                <Pressable
                  key={status}
                  onPress={async () => {
                    if (!orderFetched || !isStatusSelectable(status)) return;

                    try {
                      await updateOrderStatus({
                        orderId: orderFetched.id,
                        currentStatus: orderFetched.status,
                        nextStatus: status,
                      });
                    } catch (err) {
                      const message =
                        err instanceof Error
                          ? err.message
                          : "Failed to update order status.";
                      Alert.alert("Status update failed", message);
                    }
                  }}
                  disabled={!isStatusSelectable(status) || isUpdatingStatus}
                  style={{
                    borderColor: theme.tint,
                    borderWidth: 1,
                    padding: 10,
                    borderRadius: 5,
                    backgroundColor:
                      normalizedCurrentStatus === status
                        ? theme.tint
                        : !isStatusSelectable(status)
                          ? theme.placeholder
                          : "transparent",
                    opacity: !isStatusSelectable(status) || isUpdatingStatus ? 0.6 : 1,
                  }}
                >
                  <Text
                    style={{
                      color:
                        normalizedCurrentStatus === status
                          ? theme.card
                          : !isStatusSelectable(status)
                            ? theme.textSecondary
                            : theme.tint,
                    }}
                  >
                    {status}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}
      />
    </View>
  );
}
