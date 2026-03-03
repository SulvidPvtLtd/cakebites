import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/src/lib/supabase";

export const useProductSubscription = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const productsChannel = supabase
      .channel("user-products-channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "products" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["products"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "products" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["products"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "products" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["products"] });
        }
      )
      .subscribe();

    return () => {
      productsChannel.unsubscribe();
    };
  }, [queryClient]);
};
