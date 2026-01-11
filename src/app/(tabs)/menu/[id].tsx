import {
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Stack, Redirect, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';

import products from '@/assets/data/products';
import { defaultPizzaImage } from '@/src/components/ProductListItem';
import Colors from '../../../constants/Colors';
import { useColorScheme } from 'react-native';

/**
 * Route params MUST be declared at top level
 */
type ProductDetailsParams = {
  id?: string;
};

const AVAILABLE_SIZES = ['S', 'M', 'L', 'XL'] as const;

export default function ProductDetailsScreen() {
  const params = useLocalSearchParams<ProductDetailsParams>();
  const { height: windowHeight } = useWindowDimensions();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  /**
   * Validate and normalize product ID
   */
  const productId = useMemo<number | null>(() => {
    if (!params.id) return null;

    const parsedId = Number(params.id);
    if (!Number.isInteger(parsedId) || parsedId <= 0) return null;

    return parsedId;
  }, [params.id]);

  /**
   * Guard invalid route access
   */
  if (!productId) {
    return <Redirect href="/(tabs)/menu" />;
  }

  /**
   * Lookup product (local data for now)
   */
  const product = useMemo(
    () => products.find((p) => p.id === productId),
    [productId]
  );

  /**
   * Local UI state
   */
  const [selectedSize, setSelectedSize] =
    useState<(typeof AVAILABLE_SIZES)[number]>('M');

  /**
   * Loading / Not found state
   */
  if (!product) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.tint} />
        <Text style={[styles.infoText, { color: theme.textSecondary }]}>
          Loading product…
        </Text>
      </View>
    );
  }

  /**
   * Defensive formatting
   */
  const price =
    typeof product.price === 'number'
      ? `$${product.price.toFixed(2)}`
      : '--';

  const imageSource =
    typeof product.image === 'string' && product.image.length > 0
      ? { uri: product.image }
      : { uri: defaultPizzaImage };

  return (
    <View
      style={[
        styles.page,
        { backgroundColor: Platform.OS === 'web' ? theme.background : theme.background },
      ]}
    >
      <View style={[styles.container, { backgroundColor: theme.card }]}>
        <Stack.Screen
          options={{
            title: product.name ?? 'Product',
            headerBackTitle: 'Back',
            headerStyle: { backgroundColor: theme.card },
            headerTintColor: theme.textPrimary,
          }}
        />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={Platform.OS === 'web'}
        >
          <Image
            source={imageSource}
            style={[
              styles.image,
              {
                maxHeight: windowHeight * 0.5,
                backgroundColor: theme.placeholder,
              },
            ]}
            accessibilityRole="image"
            accessibilityLabel={product.name ?? 'Product image'}
          />

          <View style={styles.content}>
            <Text style={[styles.name, { color: theme.textPrimary }]}>
              {product.name}
            </Text>

            <Text style={[styles.price, { color: theme.tint }]}>
              {price}
            </Text>

            <Text
              style={[
                styles.sectionLabel,
                { color: theme.textSecondary },
              ]}
            >
              Select size
            </Text>

            <View style={styles.sizesRow}>
              {AVAILABLE_SIZES.map((size) => {
                const isSelected = selectedSize === size;

                return (
                  <Pressable
                    key={size}
                    onPress={() => setSelectedSize(size)}
                    accessibilityRole="button"
                    accessibilityLabel={`Select size ${size}`}
                    style={({ pressed }) => [
                      styles.sizeButton,
                      {
                        backgroundColor: isSelected
                          ? theme.tint
                          : theme.card,
                        borderColor: theme.border,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.sizeText,
                        {
                          color: isSelected
                            ? '#FFFFFF'
                            : theme.textPrimary,
                        },
                      ]}
                    >
                      {size}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text
              style={[
                styles.description,
                { color: theme.textSecondary },
              ]}
            >
              {product.description?.trim() ||
                'No description available for this product.'}
            </Text>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    alignItems: 'center',
  },

  container: {
    flex: 1,
    width: '100%',
    maxWidth: 520,
  },

  scrollContent: {
    paddingBottom: 24,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  infoText: {
    marginTop: 12,
    fontSize: 14,
  },

  image: {
    width: '100%',
    aspectRatio: 1,
    resizeMode: 'contain',
  },

  content: {
    padding: 16,
  },

  name: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 6,
  },

  price: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },

  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },

  sizesRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },

  sizeButton: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sizeText: {
    fontSize: 14,
    fontWeight: '600',
  },

  description: {
    fontSize: 15,
    lineHeight: 21,
  },
});
