// src/app/(tabs)/menu/[id].tsx
import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
import { useCart } from '@/src/providers/CartProvider';
import { ProductSize } from '@/src/types';
import { defaultPizzaImage } from '@components/ProductListItem';
import Colors from '@constants/Colors';

type ProductDetailsParams = {
  id?: string;
};

/**
 * In real-world apps, sizes should come from the API.
 * This is intentionally data-driven for future-proofing.
 */
const AVAILABLE_SIZES: readonly ProductSize[] = ['S', 'M', 'L', 'XL'];

export default function ProductDetailsScreen() {
  const { id } = useLocalSearchParams<ProductDetailsParams>();
  const { width } = useWindowDimensions();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const { addItem } = useCart();

  /* ---------------- Validation ---------------- */

  const productId = useMemo(() => {
    if (!id) return null;
    const parsed = Number(id);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [id]);

  if (!productId) {
    return <Redirect href="/(tabs)/menu" />;
  }

  /* ---------------- Data ---------------- */

  const product = useMemo(() => {
    return products.find((p) => p.id === productId) ?? null;
  }, [productId]);

  /* ---------------- State ---------------- */

  const [selectedSize, setSelectedSize] = useState<ProductSize>('M');
  const [expanded, setExpanded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const imageOpacity = useRef(new Animated.Value(0)).current;

  /* ---------------- Effects ---------------- */

  useEffect(() => {
    if (imageLoaded) {
      Animated.timing(imageOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [imageLoaded, imageOpacity]);

  /* ---------------- Guards ---------------- */

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

  /* ---------------- Actions ---------------- */

  const handleAddToCart = useCallback(() => {
    if (adding) return;
    if (!product) return;

    try {
      setAdding(true);
      addItem(product, selectedSize);
    } finally {
      // UX delay prevents accidental multi-taps
      setTimeout(() => setAdding(false), 300);
    }
  }, [adding, addItem, product, selectedSize]);

  /* ---------------- UI ---------------- */

  return (
    <View style={[styles.page, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: product.name ?? 'Product',
          headerStyle: { backgroundColor: theme.card },
          headerTintColor: theme.textPrimary,
        }}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { alignItems: 'center' },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* IMAGE */}
        <View style={styles.imageWrapper}>
          {!imageLoaded && (
            <View
              style={[
                styles.imagePlaceholder,
                { backgroundColor: theme.border },
              ]}
            />
          )}

          <Animated.Image
            source={imageSource}
            resizeMode="contain"
            onLoad={() => setImageLoaded(true)}
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
        <View style={[styles.content, { backgroundColor: theme.card }]}>
          <Text style={[styles.name, { color: theme.textPrimary }]}>
            {product.name}
          </Text>

          <Text style={[styles.price, { color: theme.tint }]}>
            ${product.price.toFixed(2)}
          </Text>

          <Text
            style={[styles.sectionLabel, { color: theme.textSecondary }]}
          >
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
                  accessibilityState={{ selected: active }}
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

          <Text
            numberOfLines={expanded ? undefined : 2}
            style={[
              styles.description,
              { color: theme.textSecondary },
            ]}
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

          <Button
            text={adding ? 'Adding…' : 'Add to Cart'}
            onPress={handleAddToCart}
            disabled={adding}
          />
        </View>
      </ScrollView>
    </View>
  );
}

/* ---------------- Styles ---------------- */

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 32,
  },

  imageWrapper: {
    alignItems: 'center',
    paddingVertical: 24,
  },

  imagePlaceholder: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    opacity: 0.15,
  },

  image: {
    aspectRatio: 1,
  },

  content: {
    width: '100%',
    maxWidth: 520,
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
