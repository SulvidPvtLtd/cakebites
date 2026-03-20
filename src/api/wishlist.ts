import { supabase } from "@/src/lib/supabase";
import type { Tables, TablesInsert } from "@/src/database.types";
import { useAuth } from "@/src/providers/AuthProvider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type WishlistRow = Tables<"wishlists">;
type ProductRow = Tables<"products">;
type WishlistInsert = TablesInsert<"wishlists">;

export type WishlistItem = WishlistRow & {
  products: ProductRow | null;
};

export const useWishlist = () => {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  return useQuery<WishlistItem[]>({
    queryKey: ["wishlist", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("wishlists")
        .select("*, products(*)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []) as WishlistItem[];
    },
  });
};

export const useWishlistActions = () => {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id ?? null;

  const invalidateWishlist = async () => {
    await queryClient.invalidateQueries({ queryKey: ["wishlist"] });
  };

  const addToWishlist = useMutation<WishlistRow, Error, number>({
    mutationFn: async (productId) => {
      if (!userId) {
        throw new Error("Please sign in to save wishlist items.");
      }

      const payload: WishlistInsert = {
        user_id: userId,
        product_id: productId,
      };

      const { data, error } = await supabase
        .from("wishlists")
        .upsert(payload, { onConflict: "user_id,product_id" })
        .select("*")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: invalidateWishlist,
  });

  const removeFromWishlist = useMutation<void, Error, number>({
    mutationFn: async (productId) => {
      if (!userId) {
        throw new Error("Please sign in to manage wishlist items.");
      }

      const { error } = await supabase
        .from("wishlists")
        .delete()
        .eq("user_id", userId)
        .eq("product_id", productId);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: invalidateWishlist,
  });

  const toggleWishlist = useMutation<void, Error, { productId: number; isSaved: boolean }>({
    mutationFn: async ({ productId, isSaved }) => {
      if (isSaved) {
        await removeFromWishlist.mutateAsync(productId);
        return;
      }

      await addToWishlist.mutateAsync(productId);
    },
  });

  return {
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
  };
};
