import { Stack } from "expo-router";
import { FlatList } from "react-native";
import orders from "@assets/data/orders";
import OrderListItem from "@components/OrderListItem";

export default function OrdersScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Orders" }} />
      <FlatList
        data={orders}
        contentContainerStyle={{ gap: 10, padding: 10 }}
        renderItem={({ item }: { item: (typeof orders)[number] }) => (
          <OrderListItem order={item} />
        )}
      />
    </>
  );
}
