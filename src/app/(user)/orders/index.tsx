import { Stack } from "expo-router";
import { ActivityIndicator, FlatList, Text } from "react-native";
import OrderListItem from "@components/OrderListItem";
import { useMyOrderList } from "@/src/api/orders";
import type { Tables } from "@/src/database.types";

type UserOrder = Tables<"orders">;

export default function OrdersScreen() {

  const { data: orders, isLoading, error } = useMyOrderList();
  const safeOrders = orders ?? [];
    if (isLoading) {
      return <ActivityIndicator />;
    }
    if (error) {
      return <Text>Failed to return the orders</Text>;
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
