import { useOrderList } from "@/src/api/orders";
import OrderListItem from "@components/OrderListItem";
import { Stack, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { ActivityIndicator, FlatList, Text } from "react-native";

export default function OrdersScreen() {

   const { data: orders, isLoading, error, refetch } = useOrderList({ archived: true });

    useFocusEffect(
      useCallback(() => {
        refetch();
      }, [refetch]),
    );

    if (isLoading) {
      return <ActivityIndicator />;
    }
    if (error) {
      return <Text>Failed to fetch</Text>;
    }

  return (
    <>
      <Stack.Screen options={{ title: "Archive" }} />
      <FlatList
        data={orders}
        contentContainerStyle={{ gap: 10, padding: 10 }}
        renderItem={({ item }) => (
          <OrderListItem order={item} routeGroup="admin" />
        )}
      />
    </>
  );
}
