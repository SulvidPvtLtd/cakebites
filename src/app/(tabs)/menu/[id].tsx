import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native';

import products from '@/assets/data/products';
import Button from '@/src/components/Button';
import { defaultPizzaImage } from '@components/ProductListItem';
import Colors from '@constants/Colors';

type ProductDetailsParams = {
  id?: string;
};

const AVAILABLE_SIZES = ['S', 'M', 'L', 'XL'] as const;

export default function ProductDetailsScreen() {
  const params = useLocalSearchParams<ProductDetailsParams>();
  const { width } = useWindowDimensions();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  /* ---------------- Validation ---------------- */

  const productId = useMemo<number | null>(() => {
    if (!params.id) return null;
    const parsed = Number(params.id);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, [params.id]);

  if (!productId) {
    return <Redirect href="/(tabs)/menu" />;
  }

  const product = useMemo(
    () => products.find((p) => p.id === productId),
    [productId]
  );

  /* ---------------- State ---------------- */

  const [selectedSize, setSelectedSize] =
    useState<(typeof AVAILABLE_SIZES)[number]>('M');

  const [expanded, setExpanded] = useState(false);

  const imageOpacity = useRef(new Animated.Value(0)).current;

  if (!product) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
    );
  }

  const imageSource =
    typeof product.image === 'string' && product.image.length > 0
      ? { uri: product.image }
      : { uri: defaultPizzaImage };

  const handleAddToCart = () => {
    console.warn('Add to Cart | Size:', selectedSize);
  };

  /* ---------------- UI ---------------- */

  return (
    <View style={[styles.page, { backgroundColor: theme.background }]}>
      <View style={[styles.container, { backgroundColor: theme.card }]}>
        <Stack.Screen
          options={{
            title: product.name ?? 'Product',
            headerStyle: { backgroundColor: theme.card },
            headerTintColor: theme.textPrimary,
          }}
        />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          persistentScrollbar={false}
        >
          {/* IMAGE */}
          <View style={styles.imageWrapper}>
            <Animated.Image
              source={imageSource}
              resizeMode="contain"
              onLoad={() => {
                Animated.timing(imageOpacity, {
                  toValue: 1,
                  duration: 300,
                  useNativeDriver: true,
                }).start();
              }}
              style={[
                styles.image,
                {
                  width: Math.min(width * 0.75, 320),
                  opacity: imageOpacity,
                },
              ]}
              accessibilityRole="image"
              accessibilityLabel={product.name ?? 'Product image'}
            />
          </View>

          {/* CONTENT */}
          <View style={styles.content}>
            <Text style={[styles.name, { color: theme.textPrimary }]}>
              {product.name}
            </Text>

            <Text style={[styles.price, { color: theme.tint }]}>
              ${product.price.toFixed(2)}
            </Text>

            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
              Select size
            </Text>

            <View style={styles.sizesRow}>
              {AVAILABLE_SIZES.map((size) => {
                const active = selectedSize === size;

                return (
                  <Pressable
                    key={size}
                    onPress={() => setSelectedSize(size)}
                    accessibilityRole="button"
                    style={[
                      styles.sizeButton,
                      {
                        backgroundColor: active
                          ? theme.tint
                          : theme.card,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.sizeText,
                        {
                          color: active
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

            {/* DESCRIPTION */}
            <Text
              numberOfLines={expanded ? undefined : 2}
              style={[styles.description, { color: theme.textSecondary }]}
            >
              {product.description?.trim() ||
                'No description available.'}
            </Text>

            <Pressable
              onPress={() => setExpanded((v) => !v)}
              accessibilityRole="button"
            >
              <Text style={[styles.readMore, { color: theme.tint }]}>
                {expanded ? 'Read Less' : 'Read More'}
              </Text>
            </Pressable>

            <Button text="Add to Cart" onPress={handleAddToCart} />
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

/* ---------------- Styles ---------------- */

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
    paddingBottom: 32,
  },

  imageWrapper: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },

  image: {
    aspectRatio: 1,
  },

  content: {
    paddingHorizontal: 16,
  },

  name: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 4,
  },

  price: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },

  sectionLabel: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
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
    justifyContent: 'center',
    alignItems: 'center',
  },

  sizeText: {
    fontSize: 14,
    fontWeight: '600',
  },

  description: {
    fontSize: 15,
    lineHeight: 21,
  },

  readMore: {
    marginTop: 6,
    marginBottom: 20,
    fontWeight: '600',
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
