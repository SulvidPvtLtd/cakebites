import { View, Text, StyleSheet, Pressable, useColorScheme } from "react-native";
import React from "react";
import { Tables } from "../types";
import relativeTime from "dayjs/plugin/relativeTime";
import dayjs from "dayjs";
import { Link } from "expo-router";
import Colors from "@/src/constants/Colors";

dayjs.extend(relativeTime);

type OrderListItemProps = {
  order: Tables<"orders">;
  routeGroup?: "admin" | "user";
  statusSubtext?: string;
  customerEmail?: string;
  customerMobile?: string;
};

const OrderListItem = ({
  order,
  routeGroup = "user",
  statusSubtext,
  customerEmail,
  customerMobile,
}: OrderListItemProps) => {
  const scheme = useColorScheme() ?? "light";
  const theme = Colors[scheme];
  const href: `/(admin)/orders/${number}` | `/(user)/orders/${number}` =
    routeGroup === "admin" ? `/(admin)/orders/${order.id}` : `/(user)/orders/${order.id}`;
  const createdAtDate = new Date(order.created_at);
  const createdAtRelative = dayjs(order.created_at).fromNow();
  const createdAtSouthAfrica = Number.isNaN(createdAtDate.getTime())
    ? "Invalid date"
    : new Intl.DateTimeFormat("en-ZA", {
        timeZone: "Africa/Johannesburg",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(createdAtDate);
  const fulfillmentLabel = order.delivery_option === "No" ? "Self collect" : "Delivery";

  return (
    <Link href={href} asChild>
      <Pressable
        style={[
          styles.container,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <View>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Order #{order.id}</Text>
          <Text style={[styles.time, { color: theme.textSecondary }]}>{createdAtRelative}</Text>
          <Text style={[styles.timeExact, { color: theme.textSecondary }]}>
            {createdAtSouthAfrica} SAST
          </Text>
          {customerEmail ? (
            <Text style={[styles.contactText, { color: theme.textSecondary }]}>
              Email: {customerEmail}
            </Text>
          ) : null}
          {customerMobile ? (
            <Text style={[styles.contactText, { color: theme.textSecondary }]}>
              Mobile: {customerMobile}
            </Text>
          ) : null}
          {routeGroup === "admin" ? (
            <Text style={[styles.fulfillmentText, { color: theme.tint }]}>
              Fulfilment: {fulfillmentLabel}
            </Text>
          ) : null}
        </View>

        <View style={styles.statusContainer}>
          <Text style={[styles.status, { color: theme.textPrimary }]}>{order.status}</Text>
          {statusSubtext ? (
            <Text style={[styles.statusSubtext, { color: theme.tint }]}>{statusSubtext}</Text>
          ) : null}
        </View>
      </Pressable>
    </Link>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontWeight: "bold",
    marginVertical: 5,
  },
  time: {},
  timeExact: {
    fontSize: 12,
    marginTop: 2,
  },
  status: {
    fontWeight: "500",
  },
  statusContainer: {
    alignItems: "flex-end",
    gap: 4,
  },
  statusSubtext: {
    fontWeight: "700",
  },
  contactText: {
    fontSize: 12,
    marginTop: 2,
  },
  fulfillmentText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: "600",
  },
});

export default OrderListItem;
