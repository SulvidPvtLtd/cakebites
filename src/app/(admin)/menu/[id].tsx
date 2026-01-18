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
    return <Redirect href="/(admin)/menu" />;
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
    // console.warn('Add to Cart: ', product, selectedSize );
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
        </View>
      
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

  sizeText: {
    fontSize: 14,
    fontWeight: '600',
  },

  description: {
    fontSize: 15,
    lineHeight: 21,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
