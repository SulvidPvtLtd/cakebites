import { supabase } from "@/src/lib/supabase";
import type { Tables, TablesInsert, TablesUpdate } from "@/src/database.types";
import { useAuth } from "@/src/providers/AuthProvider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type DeliverySettingsRow = Tables<"delivery_settings">;
type DeliverySettingsInsert = TablesInsert<"delivery_settings">;
type DeliverySettingsUpdate = TablesUpdate<"delivery_settings">;

export type DeliveryQuote = {
  collectionAddress: string;
  deliveryAddress: string;
  deliveryRate: number;
  distanceKm: number;
  deliveryFee: number;
};

const normalizeErrorMessage = (message: string) => {
  const trimmed = message.trim();
  if (!trimmed) return message;
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed) as {
        error?: string;
        message?: string;
        details?: string;
      };
      const candidate = parsed.error ?? parsed.message ?? parsed.details;
      if (candidate) return candidate;
    } catch {
      // fall through
    }
  }
  return message;
};

const getFunctionErrorMessage = async (error: unknown) => {
  const response = (error as { context?: Response })?.context;
  if (response && typeof response.text === "function") {
    try {
      const responseText = await (response.clone?.() ?? response).text();
      if (responseText) {
        try {
          const parsed = JSON.parse(responseText) as {
            error?: string;
            message?: string;
            details?: string;
          };
          const candidate = parsed.error ?? parsed.message ?? parsed.details;
          if (candidate) return candidate;
        } catch {
          return normalizeErrorMessage(responseText);
        }
      }
    } catch {
      // ignore
    }
  }

  const rawBody =
    (error as { context?: { body?: unknown; _bodyInit?: { _data?: unknown } } })?.context
      ?._bodyInit?._data ??
    (error as { context?: { body?: unknown } })?.context?.body ??
    null;

  if (rawBody) {
    try {
      const parsed = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
      const candidate =
        (parsed as { error?: string; message?: string; details?: string })?.error ??
        (parsed as { message?: string })?.message ??
        (parsed as { details?: string })?.details;
      if (candidate) return candidate;
      if (typeof parsed === "string") return normalizeErrorMessage(parsed);
      return JSON.stringify(parsed);
    } catch {
      return normalizeErrorMessage(String(rawBody));
    }
  }

  const message = (error as { message?: string })?.message ?? "Request failed.";
  return normalizeErrorMessage(message);
};

export const useDeliverySettings = () => {
  return useQuery<DeliverySettingsRow | null>({
    queryKey: ["delivery-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      return data ?? null;
    },
  });
};

export const validateDeliveryAddress = async (deliveryAddress: string) => {
  const normalizedDeliveryAddress = deliveryAddress.trim();
  if (!normalizedDeliveryAddress) {
    throw new Error("Delivery address is required.");
  }

  const { data, error } = await supabase.functions.invoke("calculate-delivery-quote", {
    body: {
      deliveryAddress: normalizedDeliveryAddress,
      validateOnly: true,
    },
  });

  if (error) {
    throw new Error(await getFunctionErrorMessage(error));
  }

  return data as { ok: boolean; deliveryAddress: string };
};

export const useUpdateDeliverySettings = () => {
  const queryClient = useQueryClient();

  return useMutation<
    DeliverySettingsRow,
    Error,
    Pick<
      DeliverySettingsUpdate,
      "collection_address" | "delivery_rate" | "fulfillment_location_id"
    >
  >({
    mutationFn: async ({
      collection_address,
      delivery_rate,
      fulfillment_location_id,
    }) => {
      const payload: DeliverySettingsInsert = {
        id: 1,
        collection_address: collection_address?.trim() || null,
        delivery_rate: Number(delivery_rate ?? 0),
        fulfillment_location_id: fulfillment_location_id ?? null,
      };

      const { data, error } = await supabase
        .from("delivery_settings")
        .upsert(payload)
        .select("*")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["delivery-settings"] });
      await queryClient.invalidateQueries({ queryKey: ["delivery-quote"] });
    },
  });
};

export const useDeliveryQuote = ({
  enabled,
  deliveryAddress,
}: {
  enabled: boolean;
  deliveryAddress?: string | null;
}) => {
  const { session } = useAuth();

  return useQuery<DeliveryQuote>({
    queryKey: ["delivery-quote", deliveryAddress?.trim() ?? ""],
    enabled: enabled && Boolean(session?.access_token) && Boolean(deliveryAddress?.trim()),
    queryFn: async () => {
      const normalizedDeliveryAddress = deliveryAddress?.trim() ?? "";
      if (!normalizedDeliveryAddress) {
        throw new Error("Delivery address is required.");
      }

      const { data, error } = await supabase.functions.invoke("calculate-delivery-quote", {
        body: {
          deliveryAddress: normalizedDeliveryAddress,
        },
      });

      if (error) {
        throw new Error(await getFunctionErrorMessage(error));
      }

      return data as DeliveryQuote;
    },
    retry: false,
  });
};
