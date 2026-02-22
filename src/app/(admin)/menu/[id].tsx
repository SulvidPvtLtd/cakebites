// src/app/(tabs)/menu/[id].tsx
import { Link, Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native';

import { useProduct } from '@/src/api/products';
import Button from '@/src/components/Button';
import { useCart } from '@/src/providers/CartProvider';
import { ProductSize } from '@/src/types';
import { defaultPizzaImage } from '@components/ProductListItem';
import Colors from '@constants/Colors';
import FontAwesome from '@expo/vector-icons/FontAwesome';

type ProductDetailsParams = {
  id?: string;
};

/**
 * In real-world apps, sizes should come from the API.
 * This is intentionally data-driven for future-proofing.
 */
const AVAILABLE_SIZES: readonly ProductSize[] = ['S', 'M', 'L', 'XL'];

export default function ProductDetailsScreen() {
  const { id: idParam } = useLocalSearchParams<ProductDetailsParams>();
  const idString = typeof idParam === 'string' ? idParam : idParam?.[0];
  
  /* safely convert a route/string parameter into a valid numeric product ID */
  const productId = useMemo(() => {
    if (!idString) return null;
    const parsed = Number(idString);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [idString]);

  /* ---------------- Data ---------------- */
  const { data: product } = useProduct(productId ?? -1);

  const { width } = useWindowDimensions();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const {
    addItem,
    fulfillmentOption,
    hasAcceptedDeliveryTerms,
    setFulfillmentOption,
  } = useCart();
  const router = useRouter();

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

  if (!productId) {
    return <Redirect href="/(admin)/menu" />;
  }

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

  const handleAddToCart = () => {
    if (adding) return;
    if (!product) return;

    try {
      setAdding(true);

      if (fulfillmentOption === "COLLECTION") {
        addItem(product, selectedSize);
        router.push("/cart");
        return;
      }

      if (fulfillmentOption === "DELIVERY") {
        if (hasAcceptedDeliveryTerms) {
          addItem(product, selectedSize);
          router.push("/cart");
        } else {
          router.push({
            pathname: "/delivery-terms",
            params: { productId: String(product.id), size: selectedSize },
          });
        }
        return;
      }

      Alert.alert(
        "Choose Fulfilment",
        "Do you want this order delivered, or will you self-collect?",
        [
          {
            text: "Self collect",
            onPress: () => {
              setFulfillmentOption("COLLECTION");
              addItem(product, selectedSize);
              router.push("/cart");
            },
          },
          {
            text: "Delivery",
            onPress: () => {
              if (hasAcceptedDeliveryTerms) {
                setFulfillmentOption("DELIVERY");
                addItem(product, selectedSize);
                router.push("/cart");
                return;
              }

              router.push({
                pathname: "/delivery-terms",
                params: { productId: String(product.id), size: selectedSize },
              });
            },
          },
          { text: "Cancel", style: "cancel" },
        ],
      );
    } finally {
      // UX delay prevents accidental multi-taps
      setTimeout(() => setAdding(false), 300);
    }
  };

  /* ---------------- UI ---------------- */

  return (
    <View style={[styles.page, { backgroundColor: theme.background }]}>

      <Stack.Screen        
        options={{
          title: "Menu",
          headerRight: () => (
            <Link href={`/(admin)/menu/create?id=${productId}`} asChild>
              <Pressable>
                {({ pressed }) => (
                  <FontAwesome
                    name="pencil"
                    size={25}
                    color={Colors.light.tint}
                    style={{ marginRight: 15, opacity: pressed ? 0.5 : 1 }}
                  />
                )}
              </Pressable>
            </Link>
          ),
        }}
      />

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

          <Text
            numberOfLines={expanded ? undefined : 2}
            style={[styles.description, { color: theme.textSecondary }]}
          >
            {product.description?.trim() || 'No description available.'}
          </Text>

          <Pressable
            onPress={() => setExpanded((prev) => !prev)}
            accessibilityRole="button"
          >
            <Text style={[styles.readMore, { color: theme.tint }]}>
              {expanded ? 'Show Less' : 'Show More'}
            </Text>
          </Pressable>
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
