import { useCart } from '@providers/CartProvider';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CartItem, Product } from '../types';

type CartType = {
  items: CartItem[],
  addItem: (product: Product, size: CartItem['size']) => void,
  removeItem: (product: Product) => void,
};

const CartScreen = () => {
  const { items } = useCart();

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        Cart items length: {items.length}
      </Text>
    </View>
  );
};

export default CartScreen;

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    color: 'green',
  },
});
