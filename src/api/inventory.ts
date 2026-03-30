import { supabase } from "@/src/lib/supabase";
import type { Tables, TablesInsert, TablesUpdate } from "@/src/database.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type InventoryLocation = Tables<"inventory_locations">;
type InventoryLocationInsert = TablesInsert<"inventory_locations">;
type InventoryLocationUpdate = TablesUpdate<"inventory_locations">;
type InventoryLevel = Tables<"inventory_levels">;
type InventoryLevelInsert = TablesInsert<"inventory_levels">;
type InventoryLevelUpdate = TablesUpdate<"inventory_levels">;
type InventoryTransaction = Tables<"inventory_transactions">;
type Supplier = Tables<"suppliers">;
type SupplierInsert = TablesInsert<"suppliers">;
type SupplierUpdate = TablesUpdate<"suppliers">;
type ReorderRule = Tables<"reorder_rules">;
type ReorderRuleInsert = TablesInsert<"reorder_rules">;
type ReorderRuleUpdate = TablesUpdate<"reorder_rules">;
type InventoryAlert = Tables<"inventory_alerts">;

export type InventoryTransactionWithProduct = InventoryTransaction & {
  products?: Pick<Tables<"products">, "id" | "name" | "sku" | "barcode"> | null;
};

export type ReorderRuleWithRelations = ReorderRule & {
  products?: Pick<Tables<"products">, "id" | "name" | "sku" | "barcode"> | null;
  suppliers?: Pick<Supplier, "id" | "name" | "lead_time_days"> | null;
};

export type InventoryAlertWithRelations = InventoryAlert & {
  products?: Pick<Tables<"products">, "id" | "name" | "sku" | "barcode"> | null;
  inventory_locations?: Pick<Tables<"inventory_locations">, "id" | "name" | "code"> | null;
};

type InventoryLocationFilters = {
  includeInactive?: boolean;
};

export const useInventoryLocations = (filters: InventoryLocationFilters = {}) => {
  const { includeInactive = false } = filters;

  return useQuery<InventoryLocation[]>({
    queryKey: ["inventory-locations", { includeInactive }],
    queryFn: async () => {
      let query = supabase.from("inventory_locations").select("*");
      if (!includeInactive) {
        query = query.eq("is_active", true);
      }
      const { data, error } = await query.order("name", { ascending: true });
      if (error) {
        throw new Error(error.message);
      }
      return data ?? [];
    },
  });
};

export const useSuppliers = () => {
  return useQuery<Supplier[]>({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return data ?? [];
    },
  });
};

export const useCreateSupplier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    async mutationFn(
      payload: Pick<
        SupplierInsert,
        "name" | "contact_email" | "contact_phone" | "lead_time_days" | "is_active"
      >,
    ) {
      const { data, error } = await supabase
        .from("suppliers")
        .insert({
          name: payload.name,
          contact_email: payload.contact_email ?? null,
          contact_phone: payload.contact_phone ?? null,
          lead_time_days: payload.lead_time_days ?? 0,
          is_active: payload.is_active ?? true,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });
};

export const useUpdateSupplier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    async mutationFn(
      payload: { id: Supplier["id"] } & Pick<
        SupplierUpdate,
        "name" | "contact_email" | "contact_phone" | "lead_time_days" | "is_active"
      >,
    ) {
      const { data, error } = await supabase
        .from("suppliers")
        .update({
          name: payload.name,
          contact_email: payload.contact_email ?? null,
          contact_phone: payload.contact_phone ?? null,
          lead_time_days: payload.lead_time_days ?? 0,
          is_active: payload.is_active ?? true,
        })
        .eq("id", payload.id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });
};

export const useCreateInventoryLocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    async mutationFn(
      payload: Pick<InventoryLocationInsert, "name" | "code" | "address" | "is_active">,
    ) {
      const { data, error } = await supabase
        .from("inventory_locations")
        .insert({
          name: payload.name,
          code: payload.code,
          address: payload.address ?? null,
          is_active: payload.is_active ?? true,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-locations"] });
    },
  });
};

export const useUpdateInventoryLocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    async mutationFn(
      payload: { id: InventoryLocation["id"] } & Pick<
        InventoryLocationUpdate,
        "name" | "code" | "address" | "is_active"
      >,
    ) {
      const { data, error } = await supabase
        .from("inventory_locations")
        .update({
          name: payload.name,
          code: payload.code,
          address: payload.address ?? null,
          is_active: payload.is_active,
        })
        .eq("id", payload.id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-locations"] });
    },
  });
};

export const useArchiveInventoryLocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    async mutationFn(id: InventoryLocation["id"]) {
      const { error } = await supabase
        .from("inventory_locations")
        .update({ is_active: false } satisfies Pick<InventoryLocationUpdate, "is_active">)
        .eq("id", id);

      if (error) {
        throw new Error(error.message);
      }

      return id;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-locations"] });
    },
  });
};

export const useInventoryLevels = (locationId?: number | null) => {
  return useQuery<InventoryLevel[]>({
    queryKey: ["inventory-levels", locationId],
    enabled: Number.isFinite(locationId) && !!locationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_levels")
        .select("*")
        .eq("location_id", locationId ?? 0)
        .order("product_id", { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return data ?? [];
    },
  });
};

type InventoryTransactionFilters = {
  locationId?: number | null;
  productId?: number | null;
  limit?: number;
};

export const useInventoryTransactions = (filters: InventoryTransactionFilters = {}) => {
  const { locationId, productId, limit = 20 } = filters;

  return useQuery<InventoryTransactionWithProduct[]>({
    queryKey: ["inventory-transactions", { locationId, productId, limit }],
    enabled: Number.isFinite(locationId) && !!locationId,
    queryFn: async () => {
      let query = supabase
        .from("inventory_transactions")
        .select("*, products(id, name, sku, barcode)")
        .eq("location_id", locationId ?? 0)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (Number.isFinite(productId) && productId) {
        query = query.eq("product_id", productId);
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []) as InventoryTransactionWithProduct[];
    },
  });
};

export const useReorderRules = (locationId?: number | null) => {
  return useQuery<ReorderRuleWithRelations[]>({
    queryKey: ["reorder-rules", locationId],
    enabled: Number.isFinite(locationId) && !!locationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reorder_rules")
        .select("*, products(id, name, sku, barcode), suppliers(id, name, lead_time_days)")
        .eq("location_id", locationId ?? 0)
        .order("product_id", { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []) as ReorderRuleWithRelations[];
    },
  });
};

export const useUpsertReorderRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    async mutationFn(
      payload: Pick<
        ReorderRuleInsert,
        | "product_id"
        | "location_id"
        | "reorder_point"
        | "safety_stock"
        | "lead_time_days"
        | "supplier_id"
        | "is_active"
      >,
    ) {
      const { data, error } = await supabase
        .from("reorder_rules")
        .upsert(
          {
            product_id: payload.product_id,
            location_id: payload.location_id,
            reorder_point: payload.reorder_point ?? 0,
            safety_stock: payload.safety_stock ?? 0,
            lead_time_days: payload.lead_time_days ?? 0,
            supplier_id: payload.supplier_id ?? null,
            is_active: payload.is_active ?? true,
          },
          { onConflict: "product_id,location_id" },
        )
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ["reorder-rules", variables.location_id],
      });
      await queryClient.invalidateQueries({
        queryKey: ["inventory-alerts"],
      });
    },
  });
};

type InventoryAlertFilters = {
  locationId?: number | null;
  status?: Array<InventoryAlert["status"]>;
  limit?: number;
};

export const useInventoryAlerts = (filters: InventoryAlertFilters = {}) => {
  const { locationId, status, limit = 20 } = filters;

  return useQuery<InventoryAlertWithRelations[]>({
    queryKey: ["inventory-alerts", { locationId, status, limit }],
    enabled: Number.isFinite(locationId) && !!locationId,
    queryFn: async () => {
      let query = supabase
        .from("inventory_alerts")
        .select("*, products(id, name, sku, barcode), inventory_locations(id, name, code)")
        .eq("location_id", locationId ?? 0)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (status && status.length > 0) {
        query = query.in("status", status);
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []) as InventoryAlertWithRelations[];
    },
  });
};

export const useGenerateInventoryAlerts = () => {
  const queryClient = useQueryClient();

  return useMutation({
    async mutationFn(locationId?: number | null) {
      const { data, error } = await supabase.rpc("generate_inventory_alerts", {
        p_location_id: locationId ?? null,
      });

      if (error) {
        throw new Error(error.message);
      }

      return typeof data === "number" ? data : 0;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-alerts"] });
    },
  });
};

type AcknowledgeAlertInput = {
  alert_id: number;
  note?: string | null;
};

export const useAcknowledgeInventoryAlert = () => {
  const queryClient = useQueryClient();

  return useMutation({
    async mutationFn(payload: AcknowledgeAlertInput) {
      const { error } = await supabase.rpc("acknowledge_inventory_alert", {
        p_alert_id: payload.alert_id,
        p_note: payload.note ?? null,
      });

      if (error) {
        throw new Error(error.message);
      }

      return payload.alert_id;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-alerts"] });
    },
  });
};

export const useUpsertInventoryLevel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    async mutationFn(
      payload: Pick<
        InventoryLevelInsert,
        "product_id" | "location_id" | "on_hand" | "reserved" | "status"
      >,
    ) {
      const { data, error } = await supabase
        .from("inventory_levels")
        .upsert(
          {
            product_id: payload.product_id,
            location_id: payload.location_id,
            on_hand: payload.on_hand ?? 0,
            reserved: payload.reserved ?? 0,
            status: payload.status ?? "available",
          },
          { onConflict: "product_id,location_id" },
        )
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ["inventory-levels", variables.location_id],
      });
    },
  });
};

type AdjustInventoryInput = {
  product_id: number;
  location_id: number;
  delta_on_hand: number;
  delta_reserved?: number;
  movement_type?: string;
  reason?: string | null;
  order_id?: number | null;
  metadata?: Record<string, unknown> | null;
};

type AdjustInventoryResult = {
  transaction_id: number;
  on_hand: number;
  reserved: number;
  status: string;
};

export const useAdjustInventory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    async mutationFn(payload: AdjustInventoryInput) {
      const { data, error } = await supabase.rpc("adjust_inventory", {
        p_product_id: payload.product_id,
        p_location_id: payload.location_id,
        p_delta_on_hand: payload.delta_on_hand,
        p_delta_reserved: payload.delta_reserved ?? 0,
        p_movement_type: payload.movement_type ?? "adjustment",
        p_reason: payload.reason ?? null,
        p_order_id: payload.order_id ?? null,
        p_metadata: payload.metadata ?? null,
      });

      if (error) {
        throw new Error(error.message);
      }

      return (data?.[0] ?? null) as AdjustInventoryResult | null;
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ["inventory-levels", variables.location_id],
      });
      await queryClient.invalidateQueries({
        queryKey: ["inventory-transactions"],
      });
    },
  });
};

export type {
  InventoryLocation,
  InventoryLevel,
  InventoryLevelUpdate,
  Supplier,
  ReorderRule,
  InventoryAlert,
};
