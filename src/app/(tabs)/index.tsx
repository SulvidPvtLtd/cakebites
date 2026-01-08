import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import products from '../../../assets/data/products';
import Colors from '../../constants/Colors';

export default function TabOneScreen() {
  // Auto-detect system theme
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  // Defensive data access
  // const product =
  //   Array.isArray(products) && products.length > 0
  //     ? products[0]
  //     : null;
  let product = null;
  if (Array.isArray(products) && products.length > 0) {
    product = products[0];
  }

  // Graceful empty state
  if (!product) {
    return (
      <SafeAreaView
        style={[styles.centered, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <Text
          style={[styles.errorText, { color: colors.error }]}
          accessibilityRole="alert"
        >
          Product unavailable
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
        accessibilityRole="summary"
      >
        <Image
          source={{ uri: product.image }}
          style={styles.image}
          resizeMode="contain"
          accessibilityLabel={`${product.name} image`}
        />

        <View style={styles.textContainer}>
          <Text
            style={[styles.title, { color: colors.textPrimary }]}
            numberOfLines={2}
            accessibilityRole="header"
          >
            {product.name}
          </Text>

          <Text
            style={[styles.price, { color: colors.tint }]}
            accessibilityLabel={`Price ${product.price.toFixed(2)} dollars`}
          >
            ${product.price.toFixed(2)}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    padding: 16,
  },

  card: {
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,

    // Elevation / shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },

  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
  },

  textContainer: {
    marginTop: 16,
  },

  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 6,
  },

  price: {
    fontSize: 18,
    fontWeight: '700',
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  errorText: {
    fontSize: 16,
  },
});
