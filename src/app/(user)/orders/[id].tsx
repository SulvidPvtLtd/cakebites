import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo } from "react";
import {
  FlatList,
  Text,
  View,
  Pressable,
  StyleSheet,
} from "react-native";

import orders from "@/assets/data/orders";
import OrderListItem from "@/src/components/OrderListItem";
import PlacedOrderListItems from "@/src/components/PlacedOrderListItems";
import Colors from "@/src/constants/Colors";
import { OrderStatusList } from "@/src/types";

/* -------------------------------------------------- */
/* Strong domain typing derived from source data       */
/* -------------------------------------------------- */

type Order = (typeof orders)[number];
type OrderItems = NonNullable<Order["order_items"]>;
type OrderItem = OrderItems[number];

/** Status typing (no implicit any) */
type OrderStatus = (typeof OrderStatusList)[number];

/* -------------------------------------------------- */
/* Screen                                             */
/* -------------------------------------------------- */

export default function OrderDetailScreen() {
  /**
   * Route params are external input → always optional & unsafe.
   */
  const { id } = useLocalSearchParams<{ id?: string }>();

  /**
   * Memoised order lookup
   */
  const orderFetched: Order | undefined = useMemo(() => {
    if (!id) return undefined;
    return orders.find((order) => order.id.toString() === id);
  }, [id]);

  /* -------------------------------------------------- */
  /* Defensive early exits                              */
  /* -------------------------------------------------- */

  if (!id) {
    return (
      <View style={styles.centeredContainer}>
        <Stack.Screen options={{ title: "Invalid order" }} />
        <Text>Invalid order reference.</Text>
      </View>
    );
  }

  if (!orderFetched) {
    return (
      <View style={styles.centeredContainer}>
        <Stack.Screen options={{ title: "Order not found" }} />
        <Text>Order not found.</Text>
      </View>
    );
  }

  /**
   * Normalize possibly undefined array → always safe for FlatList
   */
  const orderItems: OrderItems = orderFetched.order_items ?? [];

  /* -------------------------------------------------- */
  /* Optimised FlatList render function                 */
  /* -------------------------------------------------- */

  const renderPlacedItem = useCallback(
    ({ item }: { item: OrderItem }) => <PlacedOrderListItems item={item} />,
    [],
  );

  
  // Status width calculation

  const maxStatusLength = Math.max(
    ...OrderStatusList.map((s: OrderStatus) => s.length),
  );

  // Adaptive uniform width (auto fits longest text)
  const STATUS_BUTTON_WIDTH = maxStatusLength * 9; // 5 = average char width, 28 = horizontal padding
  

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: `Order #${id}` }} />

      {/* Order summary */}
      <OrderListItem order={orderFetched} />

      {/* Items in the order */}
      <FlatList<OrderItem>
        data={orderItems}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderPlacedItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          <View style={styles.statusSection}>
            <Text style={styles.statusTitle}>Status</Text>

            <View style={styles.statusContainer}>
              {OrderStatusList.map((status: OrderStatus) => {
                const isActive = orderFetched.status === status;

                return (
                  <Pressable
                    key={status}
                    onPress={() => console.warn("Update status")}
                    style={[
                      styles.statusChip,
                      isActive && styles.statusChipActive,
                      {
                        minWidth: STATUS_BUTTON_WIDTH,
                        alignItems: "center",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        isActive && styles.statusTextActive,
                      ]}
                    >
                      {status}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        }
      />
    </View>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    gap: 10,
  },

  centeredContainer: {
    flex: 1,
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  listContent: {
    gap: 10,
  },

  statusSection: {
    marginTop: 20,
  },

  statusTitle: {
    fontWeight: "bold",
    fontSize: 16,
  },

  statusContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },

  statusChip: {
    borderWidth: 1,
    borderColor: Colors.light.tint,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "transparent",
  },

  statusChipActive: {
    backgroundColor: Colors.light.tint,
  },

  statusText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.tint,
  },

  statusTextActive: {
    color: "#fff",
  },
});
