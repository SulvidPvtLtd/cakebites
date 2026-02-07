import orders from "@assets/data/orders";
import OrderListItem from "@components/OrderListItem";
import { Stack } from "expo-router";
import { FlatList } from "react-native";

export default function OrdersScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Index" }} />
      <FlatList
        data={orders}
        contentContainerStyle={{ gap: 10, padding: 10 }}
        renderItem={({ item }: { item: (typeof orders)[number] }) => (
          <OrderListItem order={item} routeGroup="admin" />
        )}
      />
    </>
  );
}
