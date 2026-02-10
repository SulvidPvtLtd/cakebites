import { View, Text, StyleSheet, Pressable } from 'react-native';
import React from 'react';
import { Order } from '../types';
import relativeTime from 'dayjs/plugin/relativeTime';
import dayjs from 'dayjs';
import { Link } from 'expo-router';

dayjs.extend(relativeTime);

type OrderListItemProps = {
  order: Order;
  /**
   * Explicitly control which route group to use for details navigation.
   * This is more defensive than inferring from segments because it won't
   * silently break if screens are moved or nested differently.
   */
  routeGroup?: 'admin' | 'user';
};

const OrderListItem = ({ order, routeGroup = 'user' }: OrderListItemProps) => {
  // Use the caller's explicit intent rather than deriving from navigation state.
  const href =
    routeGroup === 'admin'
      ? ({
          pathname: '/(admin)/orders/[id]',
          params: { id: String(order.id) },
        } as const)
      : ({
          pathname: '/(user)/orders/[id]',
          params: { id: String(order.id) },
        } as const);

  return (
    <Link href={href} asChild>
      <Pressable style={styles.container}>
        <View>
          <Text style={styles.title}>Order #{order.id}</Text>
          <Text style={styles.time}>{dayjs(order.created_at).fromNow()}</Text>
        </View>

        <Text style={styles.status}>{order.status}</Text>
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
  status: {
    fontWeight: '500',
  },
});

export default OrderListItem;
