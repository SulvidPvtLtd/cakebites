import { Stack, router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
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
import { fetchPaymentTransaction } from "@/src/api/payments";
import { formatCurrencyZAR } from "@/src/lib/formatCurrency";

export default function OrderDetailScreen() {
  const scheme = useColorScheme() ?? "light";
  const theme = Colors[scheme];
  const { id } = useLocalSearchParams<{ id?: string }>();
  const queryClient = useQueryClient();
  const { data: orderFetched, isLoading, error } = useOrderDetails(id);
  const { data: paymentTransaction } = useQuery({
    queryKey: ["payment-transaction", orderFetched?.payment_transaction_id ?? null],
    enabled: Boolean(orderFetched?.payment_transaction_id),
    queryFn: async () =>
      fetchPaymentTransaction(orderFetched?.payment_transaction_id ?? ""),
  });
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

  const orderTotal = Number(orderFetched.total ?? 0);
  const customerEmail = orderFetched.profiles?.email ?? "Not available";
  const customerMobile = orderFetched.profiles?.mobile_number ?? "+27 XX XXX XXXX";
  const paymentMetadata =
    paymentTransaction?.metadata &&
    typeof paymentTransaction.metadata === "object" &&
    !Array.isArray(paymentTransaction.metadata)
      ? (paymentTransaction.metadata as Record<string, unknown>)
      : null;
  const refundedAmountTotal =
    typeof paymentMetadata?.refundedAmountTotal === "number"
      ? paymentMetadata.refundedAmountTotal
      : 0;
  const refundStatus =
    typeof paymentMetadata?.refundStatus === "string"
      ? paymentMetadata.refundStatus
      : null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
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

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Order summary */}
        <OrderListItem
          order={orderFetched}
          routeGroup="admin"
          statusSubtext={formatCurrencyZAR(orderTotal)}
          customerEmail={customerEmail}
          customerMobile={customerMobile}
        />

        {orderFetched.payment_gateway === "yoco" && orderFetched.payment_transaction_id ? (
          <View
            style={[
              styles.refundCard,
              { borderColor: theme.border, backgroundColor: theme.card },
            ]}
          >
            <Text style={{ color: theme.textPrimary, fontWeight: "700" }}>
              Refund Summary
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
              Refunded so far: {formatCurrencyZAR(refundedAmountTotal, { isCents: true })}
            </Text>
            {refundStatus ? (
              <Text style={{ color: theme.tint, fontSize: 13, fontWeight: "600" }}>
                Refund status: {refundStatus}
              </Text>
            ) : null}
            <Pressable
              onPress={() =>
                router.push(`/(admin)/orders/${orderFetched.id}/refund` as never)
              }
              style={[styles.refundButton, { borderColor: theme.tint, backgroundColor: theme.card }]}
            >
              <Text style={{ color: theme.tint, fontWeight: "700", textAlign: "center" }}>
                Open Refund Flow
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Items in the order */}
        <View style={styles.itemsList}>
          {orderItems.map((item) => (
            <PlacedOrderListItems key={item.id} item={item} />
          ))}
        </View>

        <View>
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
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  scrollContent: {
    gap: 10,
    paddingBottom: 16,
  },
  refundCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    gap: 10,
  },
  refundButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  itemsList: {
    gap: 10,
  },
});
