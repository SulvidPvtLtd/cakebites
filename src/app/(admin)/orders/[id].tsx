import { Stack, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { useOrderDetails } from "@/src/api/orders";
import OrderListItem from "@/src/components/OrderListItem";
import PlacedOrderListItems from "@/src/components/PlacedOrderListItems";
import Colors from "@/src/constants/Colors";
import { OrderItem, OrderStatusList } from "@/src/types";

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data: orderFetched, isLoading, error } = useOrderDetails(id);

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

  const computedTotal = orderItems.reduce(
    (sum, item) => sum + (Number(item.products.price) || 0) * (item.quantity ?? 0),
    0,
  );
  const orderTotal = computedTotal > 0 ? computedTotal : Number(orderFetched.total ?? 0);
  const customerEmail = orderFetched.profiles?.email ?? "Not available";
  const customerMobile = orderFetched.profiles?.mobile_number ?? "+27 XX XXX XXXX";

  return (
    <View style={{ padding: 10, gap: 10 }}>
      <Stack.Screen options={{ title: `Admin Order #${id}` }} />

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
                  onPress={() => console.warn("Update status")}
                  style={{
                    borderColor: Colors.light.tint,
                    borderWidth: 1,
                    padding: 10,
                    borderRadius: 5,
                    backgroundColor:
                      orderFetched.status === status
                        ? Colors.light.tint
                        : "transparent",
                  }}
                >
                  <Text
                    style={{
                      color:
                        orderFetched.status === status
                          ? "white"
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
