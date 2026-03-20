import ProductListItem from "@components/ProductListItem";
import React from "react";
import { Alert, FlatList, Text } from "react-native";
import { useProductList } from "@/src/api/products";
import { useWishlist, useWishlistActions } from "@/src/api/wishlist";
import { useProductSubscription } from "@/src/lib/subscriptions/userProductSubscriptions";
import LoadingState from "@/src/components/LoadingState";

const GAP = 16;
const NUM_COLUMNS = 2;

export default function MenuScreen() {
  const { data: products, error, isLoading } = useProductList();
  const { data: wishlist } = useWishlist();
  const { toggleWishlist } = useWishlistActions();
  const wishlistedIds = new Set((wishlist ?? []).map((item) => item.product_id));

  useProductSubscription();

  const handleToggleWishlist = async (productId: number, isWishlisted: boolean) => {
    try {
      await toggleWishlist.mutateAsync({ productId, isSaved: isWishlisted });
    } catch (error) {
      Alert.alert(
        "Wishlist unavailable",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

  if (isLoading) {
    return (
      <LoadingState
        title="Loading menu"
        message="Products are being pulled in. Realtime updates stay separate from this initial screen state."
      />
    );
  }

  if (error) {
    return <Text>Failed to return the product</Text>;
  }

  return (
    <FlatList
      key={`columns-${NUM_COLUMNS}`}
      data={products}
      renderItem={({ item }) => (
        <ProductListItem
          product={item}
          numColumns={NUM_COLUMNS}
          showWishlistToggle
          isWishlisted={wishlistedIds.has(item.id)}
          wishlistBusy={toggleWishlist.isPending}
          onToggleWishlist={handleToggleWishlist}
        />
      )}
      keyExtractor={(item) => item.id.toString()}
      numColumns={NUM_COLUMNS}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: GAP / 2,
        paddingTop: 8,
        paddingBottom: 12,
      }}
    />
  );
}
