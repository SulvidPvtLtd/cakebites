import { Stack, router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { useOrderDetails, useUpdateOrderStatus } from "@/src/api/orders";
import OrderListItem from "@/src/components/OrderListItem";
import PlacedOrderListItems from "@/src/components/PlacedOrderListItems";
import Colors from "@/src/constants/Colors";
import { OrderItem, OrderStatusList } from "@/src/types";

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data: orderFetched, isLoading, error } = useOrderDetails(id);
  const { mutateAsync: updateOrderStatus, isPending: isUpdatingStatus } =
    useUpdateOrderStatus();

  const normalizeOrderStatus = (
    status: string,
  ): (typeof OrderStatusList)[number] | null => {
    const normalized = status.trim().toLowerCase();
    switch (normalized) {
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

  if (!id) {
    return (
      <View style={{ padding: 10 }}>
        <Stack.Screen options={{ title: "Invalid order" }} />
        <Text>Invalid order reference.</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={{ padding: 10 }}>
        <Stack.Screen options={{ title: "Loading order" }} />
        <ActivityIndicator />
      </View>
    );
  }

  if (error || !orderFetched) {
    return (
      <View style={{ padding: 10 }}>
        <Stack.Screen options={{ title: "Order not found" }} />
        <Text>Order not found.</Text>
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
    <View style={{ padding: 10, gap: 10 }}>
      <Stack.Screen
        options={{
          title: `Admin Order #${id}`,
          headerRight: () => (
            <Pressable onPress={() => router.replace("/(admin)/orders/list")}>
              <Text style={{ color: Colors.light.tint, fontWeight: "600" }}>
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
                    borderColor: Colors.light.tint,
                    borderWidth: 1,
                    padding: 10,
                    borderRadius: 5,
                    backgroundColor:
                      normalizedCurrentStatus === status
                        ? Colors.light.tint
                        : !isStatusSelectable(status)
                          ? "#EAEAEA"
                          : "transparent",
                    opacity: !isStatusSelectable(status) || isUpdatingStatus ? 0.6 : 1,
                  }}
                >
                  <Text
                    style={{
                      color:
                        normalizedCurrentStatus === status
                          ? "white"
                          : !isStatusSelectable(status)
                            ? "#8A8A8A"
                            : Colors.light.tint,
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
