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
  paymentStatusLabel?: string;
  customerEmail?: string;
  customerMobile?: string;
};

const OrderListItem = ({
  order,
  routeGroup = "user",
  statusSubtext,
  paymentStatusLabel,
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
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            Order #{order.id}
          </Text>
          <View style={styles.headerStatus}>
            <Text style={[styles.status, { color: theme.textPrimary }]}>
              {order.status}
            </Text>
            {paymentStatusLabel ? (
              <Text style={[styles.statusPaid, { color: theme.tint }]}>
                {paymentStatusLabel}
              </Text>
            ) : null}
            {statusSubtext ? null : null}
          </View>
        </View>

        <Text style={[styles.time, { color: theme.textSecondary }]}>
          {createdAtRelative}
        </Text>
        <View style={styles.timeRow}>
          <Text style={[styles.timeExact, { color: theme.textSecondary }]}>
            {createdAtSouthAfrica} SAST
          </Text>
          {statusSubtext ? (
            <Text style={[styles.priceText, { color: theme.textSecondary }]}>
              {statusSubtext}
            </Text>
          ) : null}
        </View>
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
        {statusSubtext ? null : null}
      </Pressable>
    </Link>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
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
  headerStatus: {
    alignItems: "flex-end",
    gap: 2,
  },
  priceRow: {
    alignItems: "flex-end",
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusSubtext: {
    fontWeight: "700",
    alignSelf: "flex-end",
  },
  priceText: {
    fontWeight: "600",
    fontSize: 12,
  },
  statusPaid: {
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
