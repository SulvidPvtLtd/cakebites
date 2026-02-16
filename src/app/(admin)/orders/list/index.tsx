import { useOrderList } from "@/src/api/orders";
import OrderListItem from "@components/OrderListItem";
import type { Tables } from "@/src/database.types";
import { Stack } from "expo-router";
import { ActivityIndicator,  Text,  FlatList } from "react-native";

type AdminOrder = Tables<"orders">;

export default function OrdersScreen() {

  // project-defined mock import usage (replaced by Supabase query data)
  // import ordersData from "@assets/data/orders";
  const { data: orders, isLoading, error } = useOrderList({ archived: false });
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
