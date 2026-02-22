import { View, Text, StyleSheet, Pressable } from 'react-native';
import React from 'react';
import { Order, Tables } from '../types';
import relativeTime from 'dayjs/plugin/relativeTime';
import dayjs from 'dayjs';
import { Link } from 'expo-router';

dayjs.extend(relativeTime);

type OrderListItemProps = {
  order: Tables<"orders">;
  /**
   * Explicitly control which route group to use for details navigation.
   * This is more defensive than inferring from segments because it won't
   * silently break if screens are moved or nested differently.
   */
  routeGroup?: 'admin' | 'user';
  statusSubtext?: string;
  customerEmail?: string;
  customerMobile?: string;
};

const OrderListItem = ({
  order,
  routeGroup = 'user',
  statusSubtext,
  customerEmail,
  customerMobile,
}: OrderListItemProps) => {
  // Use the caller's explicit intent rather than deriving from navigation state.
  const href: `/(admin)/orders/${number}` | `/(user)/orders/${number}` =
    routeGroup === 'admin'
      ? `/(admin)/orders/${order.id}`
      : `/(user)/orders/${order.id}`;
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
  const fulfillmentLabel =
    order.delivery_option === "No" ? "Self collect" : "Delivery";

  return (
    <Link href={href} asChild>
      <Pressable style={styles.container}>
        <View>
          <Text style={styles.title}>Order #{order.id}</Text>
          <Text style={styles.time}>{createdAtRelative}</Text>
          <Text style={styles.timeExact}>{createdAtSouthAfrica} SAST</Text>
          {customerEmail ? <Text style={styles.contactText}>Email: {customerEmail}</Text> : null}
          {customerMobile ? <Text style={styles.contactText}>Mobile: {customerMobile}</Text> : null}
          {routeGroup === "admin" ? (
            <Text style={styles.fulfillmentText}>Fulfilment: {fulfillmentLabel}</Text>
          ) : null}
        </View>

        <View style={styles.statusContainer}>
          <Text style={styles.status}>{order.status}</Text>
          {statusSubtext ? <Text style={styles.statusSubtext}>{statusSubtext}</Text> : null}
        </View>
      </Pressable>
    </Link>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
    marginVertical: 5,
  },
  time: {
    color: 'gray',
  },
  timeExact: {
    color: 'gray',
    fontSize: 12,
    marginTop: 2,
  },
  status: {
    fontWeight: '500',
  },
  statusContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusSubtext: {
    color: '#2f80ed',
    fontWeight: '700',
  },
  contactText: {
    color: 'gray',
    fontSize: 12,
    marginTop: 2,
  },
  fulfillmentText: {
    color: '#1f5fbf',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
});

export default OrderListItem;
