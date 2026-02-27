import { Redirect, Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
} from "react-native";

import { useProduct } from "@/src/api/products";
import Button from "@/src/components/Button";
import { getSafeImageUrl } from "@/src/components/ProductListItem";
import Colors from "@/src/constants/Colors";
import {
  PRODUCT_SIZES,
  getProductSizePriceMap,
  getVisibleProductDescription,
} from "@/src/lib/sizePricing";
import { useCart } from "@/src/providers/CartProvider";
import type { ProductSize } from "@/src/types";

type ProductDetailsParams = {
  id?: string;
};

export default function ProductDetailsScreen() {
  const { id: idParam } = useLocalSearchParams<ProductDetailsParams>();
  const idString = typeof idParam === "string" ? idParam : idParam?.[0];

  const { width } = useWindowDimensions();
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const router = useRouter();

  const { addItem, fulfillmentOption, hasAcceptedDeliveryTerms, setFulfillmentOption } = useCart();

  const productId = useMemo(() => {
    if (!idString) return null;
    const parsed = Number(idString);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [idString]);

  const { data: product } = useProduct(productId ?? -1);

  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const imageOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!imageLoaded) return;
    Animated.timing(imageOpacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [imageLoaded, imageOpacity]);

  const sizePriceMap = useMemo(
    () => (product ? getProductSizePriceMap(product) : null),
    [product],
  );

  const availableSizes = useMemo(() => {
    if (!sizePriceMap) return [];
    return PRODUCT_SIZES.filter((size) => sizePriceMap[size] > 0);
  }, [sizePriceMap]);

  useEffect(() => {
    if (!sizePriceMap) {
      if (selectedSize !== null) setSelectedSize(null);
      return;
    }

    if (selectedSize && sizePriceMap[selectedSize] > 0) {
      return;
    }

    setSelectedSize(availableSizes[0] ?? null);
  }, [availableSizes, selectedSize, sizePriceMap]);

  if (!productId) {
    return <Redirect href="/(user)/menu" />;
  }

  if (!product || !sizePriceMap) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
    );
  }

  const imageSource = { uri: getSafeImageUrl(product.image) };
  const selectedPrice =
    selectedSize && sizePriceMap[selectedSize] > 0 ? sizePriceMap[selectedSize] : null;
  const visibleDescription = getVisibleProductDescription(product.description);

  const handleAddToCart = () => {
    if (adding) return;
    if (!selectedSize || selectedPrice === null) {
      Alert.alert("Select size", "Please select a size before adding to cart.");
      return;
    }

    try {
      setAdding(true);

      if (fulfillmentOption === "COLLECTION") {
        addItem(product, selectedSize, selectedPrice);
        router.push("/cart");
        return;
      }

      if (fulfillmentOption === "DELIVERY") {
        if (hasAcceptedDeliveryTerms) {
          addItem(product, selectedSize, selectedPrice);
          router.push("/cart");
        } else {
          router.push({
            pathname: "/delivery-terms",
            params: {
              productId: String(product.id),
              size: selectedSize,
              unitPrice: String(selectedPrice),
            },
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
              addItem(product, selectedSize, selectedPrice);
              router.push("/cart");
            },
          },
          {
            text: "Delivery",
            onPress: () => {
              if (hasAcceptedDeliveryTerms) {
                setFulfillmentOption("DELIVERY");
                addItem(product, selectedSize, selectedPrice);
                router.push("/cart");
                return;
              }

              router.push({
                pathname: "/delivery-terms",
                params: {
                  productId: String(product.id),
                  size: selectedSize,
                  unitPrice: String(selectedPrice),
                },
              });
            },
          },
          { text: "Cancel", style: "cancel" },
        ],
      );
    } finally {
      setTimeout(() => setAdding(false), 300);
    }
  };

  return (
    <View style={[styles.page, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: product.name ?? "Product",
          headerStyle: { backgroundColor: theme.card },
          headerTintColor: theme.textPrimary,
        }}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { alignItems: "center" }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.imageWrapper}>
          {!imageLoaded && (
            <View style={[styles.imagePlaceholder, { backgroundColor: theme.border }]} />
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
            accessibilityLabel={product.name ?? "Product image"}
          />
        </View>

        <View style={[styles.content, { backgroundColor: theme.card }]}>
          <Text style={[styles.name, { color: theme.textPrimary }]}>{product.name}</Text>

          {selectedPrice !== null ? (
            <Text style={[styles.price, { color: theme.tint }]}>${selectedPrice.toFixed(2)}</Text>
          ) : (
            <Text style={[styles.price, { color: theme.textSecondary }]}>
              Select a size to see price
            </Text>
          )}

          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Select size</Text>

          <View style={styles.sizesRow}>
            {PRODUCT_SIZES.map((size) => {
              const active = selectedSize === size;
              return (
                <Pressable
                  key={size}
                  onPress={() => {
                    if (sizePriceMap[size] > 0) {
                      setSelectedSize(size);
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active, disabled: sizePriceMap[size] <= 0 }}
                  style={[
                    styles.sizeButton,
                    {
                      backgroundColor:
                        sizePriceMap[size] <= 0
                          ? theme.border
                          : active
                            ? theme.tint
                            : theme.card,
                      borderColor: sizePriceMap[size] <= 0 ? theme.border : theme.border,
                      opacity: sizePriceMap[size] <= 0 ? 0.55 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.sizeText,
                      {
                        color:
                          sizePriceMap[size] <= 0
                            ? theme.textSecondary
                            : active
                              ? "#FFFFFF"
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
            style={[styles.description, { color: theme.textSecondary }]}
          >
            {visibleDescription || "No description available."}
          </Text>

          <Pressable onPress={() => setExpanded((v) => !v)} accessibilityRole="button">
            <Text style={[styles.readMore, { color: theme.tint }]}>
              {expanded ? "Read Less" : "Read More"}
            </Text>
          </Pressable>

          <Button
            text={adding ? "Adding..." : "Add to Cart"}
            onPress={handleAddToCart}
            disabled={adding || !selectedSize || selectedPrice === null}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  imageWrapper: {
    alignItems: "center",
    paddingVertical: 24,
  },
  imagePlaceholder: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    opacity: 0.15,
  },
  image: {
    aspectRatio: 1,
  },
  content: {
    width: "100%",
    maxWidth: 520,
    paddingHorizontal: 16,
  },
  name: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 4,
  },
  price: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: "500",
  },
  sizesRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  sizeButton: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  sizeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  description: {
    fontSize: 15,
    lineHeight: 21,
  },
  readMore: {
    marginTop: 6,
    marginBottom: 20,
    fontWeight: "600",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
