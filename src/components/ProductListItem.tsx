import FontAwesome from "@expo/vector-icons/FontAwesome";
import Colors from "@constants/Colors";
import { Link } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";

import LoadingState from "@/src/components/LoadingState";
import { Tables } from "../database.types";
import { formatCurrencyZAR } from "@/src/lib/formatCurrency";

export const defaultPizzaImage =
  "https://notjustdev-dummy.s3.us-east-2.amazonaws.com/food/peperoni.png";

const GAP = 16;
const IMAGE_RATIO = 1;
const CARD_TEXT_HEIGHT = 84;
const ADMIN_CARD_TEXT_HEIGHT = 110;

export const getSafeImageUrl = (url?: string | null): string => {
  const normalized = typeof url === "string" ? url.trim() : "";
  if (!normalized) return defaultPizzaImage;
  return /^(https?:\/\/|file:\/\/|content:\/\/)/i.test(normalized)
    ? normalized
    : defaultPizzaImage;
};

const truncateTitle = (title: string, maxLength = 16): string =>
  title.length <= maxLength ? title : `${title.slice(0, maxLength)}...`;

type ProductListItemProps = {
  product: Tables<"products">;
  numColumns: number;
  showAdminStockState?: boolean;
  showWishlistToggle?: boolean;
  isWishlisted?: boolean;
  onToggleWishlist?: (productId: number, isWishlisted: boolean) => void;
  wishlistBusy?: boolean;
};

const ProductListItem = ({
  product,
  numColumns,
  showAdminStockState = false,
  showWishlistToggle = false,
  isWishlisted = false,
  onToggleWishlist,
  wishlistBusy = false,
}: ProductListItemProps) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const isOutOfStock = !product.is_active || !product.in_stock;
  const imageUri = getSafeImageUrl(product.image);
  const [imageLoaded, setImageLoaded] = useState(false);
  const showAdminIdentifiers =
    showAdminStockState && (!!product.sku || !!product.barcode);
  const adminIdentifierText = showAdminIdentifiers
    ? [
        product.sku ? `SKU: ${product.sku}` : null,
        product.barcode ? `Barcode: ${product.barcode}` : null,
      ]
        .filter(Boolean)
        .join(" • ")
    : "";

  useEffect(() => {
    setImageLoaded(false);
  }, [imageUri]);

  return (
    <View style={[styles.itemWrapper, { width: `${100 / numColumns}%` }]}>
      {showWishlistToggle && (
        <Pressable
          onPress={() => onToggleWishlist?.(product.id, isWishlisted)}
          disabled={wishlistBusy}
          style={[
            styles.wishlistButton,
            {
              backgroundColor: theme.card,
              borderColor: isWishlisted ? theme.tint : theme.border,
              opacity: wishlistBusy ? 0.6 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={
            isWishlisted ? "Remove from wishlist" : "Add to wishlist"
          }
        >
          <FontAwesome
            name={isWishlisted ? "heart" : "heart-o"}
            size={15}
            color={isWishlisted ? theme.tint : theme.textPrimary}
          />
        </Pressable>
      )}

      <Link
        href={{
          pathname: "./menu/[id]",
          params: { id: product.id },
        }}
        asChild
      >
        <Pressable style={styles.shadowWrapper}>
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <View style={styles.imageContainer}>
              {!imageLoaded && (
                <View
                  style={[styles.imageLoader, { backgroundColor: theme.placeholder }]}
                  pointerEvents="none"
                >
                  <LoadingState compact />
                </View>
              )}
              <Image
                source={{ uri: imageUri }}
                style={styles.image}
                resizeMode="contain"
                onLoadEnd={() => setImageLoaded(true)}
                onError={() => setImageLoaded(true)}
              />
            </View>

            <View
              style={[
                styles.textContainer,
                showAdminStockState && styles.adminTextContainer,
              ]}
            >
              <Text
                style={[styles.title, { color: theme.textPrimary }]}
                numberOfLines={1}
              >
                {truncateTitle(product.name)}
              </Text>

              {showAdminIdentifiers && (
                <Text
                  style={[styles.identifierText, { color: theme.textSecondary }]}
                  numberOfLines={1}
                >
                  {adminIdentifierText}
                </Text>
              )}

              <View style={styles.bottomSection}>
                <Text style={[styles.price, { color: theme.tint }]}>
                  {formatCurrencyZAR(Number(product.price ?? 0))}
                </Text>

                {showAdminStockState && isOutOfStock && (
                  <Text
                    style={[
                      styles.stockBadge,
                      { backgroundColor: theme.error, color: theme.card },
                    ]}
                  >
                    Out of stock
                  </Text>
                )}

                <Text style={[styles.linkText, { color: theme.warning }]}>
                  Go to details
                </Text>
              </View>
            </View>
          </View>
        </Pressable>
      </Link>
    </View>
  );
};

export default ProductListItem;

const styles = StyleSheet.create({
  itemWrapper: {
    paddingHorizontal: GAP / 2,
    marginBottom: GAP,
  },
  shadowWrapper: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
  },
  wishlistButton: {
    position: "absolute",
    top: 10,
    right: 18,
    zIndex: 2,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  imageContainer: {
    padding: 8,
    position: "relative",
  },
  image: {
    width: "100%",
    aspectRatio: IMAGE_RATIO,
  },
  imageLoader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    margin: 8,
  },
  textContainer: {
    height: CARD_TEXT_HEIGHT,
    paddingTop: 6,
    paddingHorizontal: 12,
    paddingBottom: 14,
  },
  adminTextContainer: {
    height: ADMIN_CARD_TEXT_HEIGHT,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
  },
  identifierText: {
    fontSize: 11,
    marginTop: 2,
  },
  bottomSection: {
    marginTop: "auto",
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  linkText: {
    fontSize: 14,
    textDecorationLine: "underline",
  },
  stockBadge: {
    alignSelf: "flex-start",
    marginBottom: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
});
