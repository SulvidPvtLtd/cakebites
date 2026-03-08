import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/providers/AuthProvider";

export const useProductSubscription = () => {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  useEffect(() => {
    if (session?.access_token) {
      // Ensure realtime channel uses the current JWT for RLS-protected changes.
      supabase.realtime.setAuth(session.access_token);
    }

    const refreshProducts = async () => {
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await queryClient.refetchQueries({ queryKey: ["products"], type: "active" });
    };

    const productsChannel = supabase
      .channel(`user-products-channel-${session?.user?.id ?? "anon"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => {
          void refreshProducts();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void refreshProducts();
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          void refreshProducts();
        }
      });

    return () => {
      void supabase.removeChannel(productsChannel);
    };
  }, [queryClient, session?.access_token, session?.user?.id]);
};
