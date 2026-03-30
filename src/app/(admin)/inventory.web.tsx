import {
  useAdjustInventory,
  useCreateInventoryLocation,
  useCreateSupplier,
  useGenerateInventoryAlerts,
  useInventoryAlerts,
  useInventoryLevels,
  useInventoryLocations,
  useInventoryTransactions,
  useReorderRules,
  useSuppliers,
  useAcknowledgeInventoryAlert,
  useUpdateSupplier,
  useUpsertReorderRule,
} from "@/src/api/inventory";
import { useAdminProductList } from "@/src/api/products";
import Button from "@/src/components/Button";
import LoadingState from "@/src/components/LoadingState";
import Colors from "@/src/constants/Colors";
import { formatCurrencyZAR } from "@/src/lib/formatCurrency";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";

type StockInputMap = Record<number, { onHand: string; reserved: string; reason: string }>;
type ReorderRuleInputMap = Record<
  number,
  {
    reorderPoint: string;
    safetyStock: string;
    leadTimeDays: string;
    supplierId: number | null;
    isActive: boolean;
  }
>;

const sanitizeIntegerInput = (value: string) => value.replace(/[^\d]/g, "");

const parseQuantity = (value?: string) => {
  if (!value) return 0;
  if (!/^\d+$/.test(value)) return null;
  return Number(value);
};

const formatDelta = (value: number) => (value > 0 ? `+${value}` : `${value}`);

const formatMovementLabel = (value: string) =>
  value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatAlertStatus = (value: string) =>
  value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

export default function InventoryScreen() {
  const scheme = useColorScheme() ?? "light";
  const theme = Colors[scheme];

  const { data: locations, isLoading: locationsLoading, error: locationsError } =
    useInventoryLocations();
  const { data: products, isLoading: productsLoading, error: productsError } =
    useAdminProductList();
  const { data: suppliers, isLoading: suppliersLoading, error: suppliersError } =
    useSuppliers();
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);

  const selectedLocation = useMemo(
    () => locations?.find((location) => location.id === selectedLocationId) ?? null,
    [locations, selectedLocationId],
  );

  useEffect(() => {
    if (selectedLocationId) return;
    if (locations && locations.length > 0) {
      setSelectedLocationId(locations[0].id);
    }
  }, [locations, selectedLocationId]);

  const {
    data: inventoryLevels,
    isLoading: levelsLoading,
    error: levelsError,
  } = useInventoryLevels(selectedLocationId);

  const {
    data: recentTransactions,
    isLoading: transactionsLoading,
    error: transactionsError,
  } = useInventoryTransactions({
    locationId: selectedLocationId,
    limit: 12,
  });

  const {
    data: reorderRules,
    isLoading: reorderRulesLoading,
    error: reorderRulesError,
  } = useReorderRules(selectedLocationId);

  const {
    data: inventoryAlerts,
    isLoading: alertsLoading,
    error: alertsError,
  } = useInventoryAlerts({
    locationId: selectedLocationId,
    status: ["active", "acknowledged"],
    limit: 12,
  });

  const levelsByProduct = useMemo(
    () =>
      new Map(
        (inventoryLevels ?? []).map((level) => [level.product_id, level]),
      ),
    [inventoryLevels],
  );

  const reorderRulesByProduct = useMemo(
    () =>
      new Map(
        (reorderRules ?? []).map((rule) => [rule.product_id, rule]),
      ),
    [reorderRules],
  );

  const activeSuppliers = useMemo(
    () => (suppliers ?? []).filter((supplier) => supplier.is_active),
    [suppliers],
  );

  const createLocation = useCreateInventoryLocation();
  const adjustInventory = useAdjustInventory();
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const upsertReorderRule = useUpsertReorderRule();
  const generateAlerts = useGenerateInventoryAlerts();
  const acknowledgeAlert = useAcknowledgeInventoryAlert();

  const [locationName, setLocationName] = useState("");
  const [locationCode, setLocationCode] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [supplierLeadTime, setSupplierLeadTime] = useState("");
  const [savingSupplierId, setSavingSupplierId] = useState<number | null>(null);

  const [stockInputs, setStockInputs] = useState<StockInputMap>({});
  const [savingProductId, setSavingProductId] = useState<number | null>(null);
  const [ruleInputs, setRuleInputs] = useState<ReorderRuleInputMap>({});
  const [savingRuleProductId, setSavingRuleProductId] = useState<number | null>(null);
  const [acknowledgingAlertId, setAcknowledgingAlertId] = useState<number | null>(null);

  const sortedProducts = useMemo(
    () =>
      [...(products ?? [])].sort((a, b) =>
        (a.name ?? "").localeCompare(b.name ?? ""),
      ),
    [products],
  );

  const trackedProducts = useMemo(
    () => sortedProducts.filter((product) => product.track_inventory ?? true),
    [sortedProducts],
  );

  useEffect(() => {
    if (!sortedProducts.length) {
      setStockInputs({});
      return;
    }

    setStockInputs((current) => {
      const nextInputs: StockInputMap = {};
      sortedProducts.forEach((product) => {
        const level = levelsByProduct.get(product.id);
        nextInputs[product.id] = {
          onHand: String(level?.on_hand ?? 0),
          reserved: String(level?.reserved ?? 0),
          reason: current[product.id]?.reason ?? "",
        };
      });
      return nextInputs;
    });
  }, [levelsByProduct, selectedLocationId, sortedProducts]);

  useEffect(() => {
    if (!trackedProducts.length || !selectedLocationId) {
      setRuleInputs({});
      return;
    }

    setRuleInputs((current) => {
      const nextInputs: ReorderRuleInputMap = {};
      trackedProducts.forEach((product) => {
        const rule = reorderRulesByProduct.get(product.id);
        nextInputs[product.id] = {
          reorderPoint: String(rule?.reorder_point ?? 0),
          safetyStock: String(rule?.safety_stock ?? 0),
          leadTimeDays: String(
            rule?.lead_time_days ??
              activeSuppliers.find((supplier) => supplier.id === rule?.supplier_id)
                ?.lead_time_days ??
              0,
          ),
          supplierId: rule?.supplier_id ?? null,
          isActive: rule?.is_active ?? true,
        };
      });
      return nextInputs;
    });
  }, [activeSuppliers, reorderRulesByProduct, selectedLocationId, trackedProducts]);

  const handleCreateLocation = async () => {
    const trimmedName = locationName.trim();
    const trimmedCode = locationCode.trim().toUpperCase();
    const trimmedAddress = locationAddress.trim();

    if (!trimmedName) {
      Alert.alert("Location required", "Enter a location name.");
      return;
    }

    if (!trimmedCode) {
      Alert.alert("Code required", "Enter a short location code.");
      return;
    }

    try {
      await createLocation.mutateAsync({
        name: trimmedName,
        code: trimmedCode,
        address: trimmedAddress || null,
        is_active: true,
      });

      setLocationName("");
      setLocationCode("");
      setLocationAddress("");
    } catch (err) {
      Alert.alert(
        "Unable to create location",
        err instanceof Error ? err.message : "Please try again.",
      );
    }
  };

  const handleCreateSupplier = async () => {
    const trimmedName = supplierName.trim();
    const trimmedEmail = supplierEmail.trim();
    const trimmedPhone = supplierPhone.trim();
    const leadTimeValue =
      supplierLeadTime.trim() === "" ? 0 : parseQuantity(supplierLeadTime);

    if (!trimmedName) {
      Alert.alert("Supplier required", "Enter a supplier name.");
      return;
    }

    if (leadTimeValue === null) {
      Alert.alert("Invalid lead time", "Enter a whole number of days.");
      return;
    }

    try {
      await createSupplier.mutateAsync({
        name: trimmedName,
        contact_email: trimmedEmail || null,
        contact_phone: trimmedPhone || null,
        lead_time_days: leadTimeValue,
        is_active: true,
      });

      setSupplierName("");
      setSupplierEmail("");
      setSupplierPhone("");
      setSupplierLeadTime("");
    } catch (err) {
      Alert.alert(
        "Unable to save supplier",
        err instanceof Error ? err.message : "Please try again.",
      );
    }
  };

  const handleToggleSupplier = async (supplierId: number, nextActive: boolean) => {
    const supplier = suppliers?.find((item) => item.id === supplierId);
    if (!supplier) return;

    setSavingSupplierId(supplierId);
    try {
      await updateSupplier.mutateAsync({
        id: supplierId,
        name: supplier.name,
        contact_email: supplier.contact_email,
        contact_phone: supplier.contact_phone,
        lead_time_days: supplier.lead_time_days,
        is_active: nextActive,
      });
    } catch (err) {
      Alert.alert(
        "Unable to update supplier",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setSavingSupplierId(null);
    }
  };

  const updateStockInput = (
    productId: number,
    field: "onHand" | "reserved",
    value: string,
  ) => {
    setStockInputs((current) => ({
      ...current,
      [productId]: {
        onHand:
          field === "onHand"
            ? sanitizeIntegerInput(value)
            : current[productId]?.onHand ?? "0",
        reserved:
          field === "reserved"
            ? sanitizeIntegerInput(value)
            : current[productId]?.reserved ?? "0",
        reason: current[productId]?.reason ?? "",
      },
    }));
  };

  const updateStockReason = (productId: number, value: string) => {
    setStockInputs((current) => ({
      ...current,
      [productId]: {
        onHand: current[productId]?.onHand ?? "0",
        reserved: current[productId]?.reserved ?? "0",
        reason: value,
      },
    }));
  };

  const handleSaveStock = async (productId: number) => {
    if (!selectedLocationId) {
      Alert.alert("Select a location", "Choose a location before editing stock.");
      return;
    }

    const input = stockInputs[productId];
    const onHand = parseQuantity(input?.onHand);
    const reserved = parseQuantity(input?.reserved);
    const reason = input?.reason?.trim() ?? "";

    if (onHand === null || reserved === null) {
      Alert.alert("Invalid quantity", "Enter whole numbers only.");
      return;
    }

    if (reserved > onHand) {
      Alert.alert("Invalid quantity", "Reserved stock cannot exceed on-hand stock.");
      return;
    }

    const currentLevel = levelsByProduct.get(productId);
    const deltaOnHand = onHand - Number(currentLevel?.on_hand ?? 0);
    const deltaReserved = reserved - Number(currentLevel?.reserved ?? 0);

    if (deltaOnHand === 0 && deltaReserved === 0) {
      Alert.alert("No changes", "There are no stock changes to save.");
      return;
    }

    setSavingProductId(productId);
    try {
      await adjustInventory.mutateAsync({
        product_id: productId,
        location_id: selectedLocationId,
        delta_on_hand: deltaOnHand,
        delta_reserved: deltaReserved,
        movement_type: "adjustment",
        reason: reason || null,
      });
      setStockInputs((current) => ({
        ...current,
        [productId]: {
          onHand: String(onHand),
          reserved: String(reserved),
          reason: "",
        },
      }));
    } catch (err) {
      Alert.alert(
        "Unable to save stock",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setSavingProductId(null);
    }
  };

  const updateRuleInput = (
    productId: number,
    updates: Partial<ReorderRuleInputMap[number]>,
  ) => {
    setRuleInputs((current) => ({
      ...current,
      [productId]: {
        reorderPoint: current[productId]?.reorderPoint ?? "0",
        safetyStock: current[productId]?.safetyStock ?? "0",
        leadTimeDays: current[productId]?.leadTimeDays ?? "0",
        supplierId: current[productId]?.supplierId ?? null,
        isActive: current[productId]?.isActive ?? true,
        ...updates,
      },
    }));
  };

  const handleSaveRule = async (productId: number) => {
    if (!selectedLocationId) {
      Alert.alert("Select a location", "Choose a location before saving rules.");
      return;
    }

    const input = ruleInputs[productId];
    const reorderPoint = parseQuantity(input?.reorderPoint);
    const safetyStock = parseQuantity(input?.safetyStock);
    const leadTimeDays = parseQuantity(input?.leadTimeDays);

    if (reorderPoint === null || safetyStock === null || leadTimeDays === null) {
      Alert.alert("Invalid values", "Enter whole numbers only.");
      return;
    }

    setSavingRuleProductId(productId);
    try {
      await upsertReorderRule.mutateAsync({
        product_id: productId,
        location_id: selectedLocationId,
        reorder_point: reorderPoint,
        safety_stock: safetyStock,
        lead_time_days: leadTimeDays,
        supplier_id: input?.supplierId ?? null,
        is_active: input?.isActive ?? true,
      });
    } catch (err) {
      Alert.alert(
        "Unable to save reorder rule",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setSavingRuleProductId(null);
    }
  };

  const handleGenerateAlerts = async () => {
    if (!selectedLocationId) {
      Alert.alert("Select a location", "Choose a location before generating alerts.");
      return;
    }

    try {
      const created = await generateAlerts.mutateAsync(selectedLocationId);
      Alert.alert(
        "Alerts generated",
        created === 1 ? "1 new alert added." : `${created} new alerts added.`,
      );
    } catch (err) {
      Alert.alert(
        "Unable to generate alerts",
        err instanceof Error ? err.message : "Please try again.",
      );
    }
  };

  const handleAcknowledgeAlert = async (alertId: number) => {
    setAcknowledgingAlertId(alertId);
    try {
      await acknowledgeAlert.mutateAsync({ alert_id: alertId });
    } catch (err) {
      Alert.alert(
        "Unable to acknowledge alert",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setAcknowledgingAlertId(null);
    }
  };

  if (locationsLoading || productsLoading || suppliersLoading) {
    return (
      <LoadingState
        title="Loading inventory"
        message="Preparing locations and product stock data."
      />
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: theme.textPrimary }]}>Inventory</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        Manage stock per location and keep product identifiers in sync.
      </Text>

      {(locationsError ||
        productsError ||
        levelsError ||
        transactionsError ||
        suppliersError ||
        reorderRulesError ||
        alertsError) && (
        <View
          style={[
            styles.notice,
            { borderColor: theme.border, backgroundColor: theme.card },
          ]}
        >
          <Text style={[styles.noticeText, { color: theme.textPrimary }]}>
            {locationsError?.message ||
              productsError?.message ||
              levelsError?.message ||
              transactionsError?.message ||
              suppliersError?.message ||
              reorderRulesError?.message ||
              alertsError?.message}
          </Text>
        </View>
      )}

      <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            Locations
          </Text>
          <FontAwesome name="map-marker" size={18} color={theme.tint} />
        </View>
        <Text style={[styles.sectionHelper, { color: theme.textSecondary }]}>
          Select a location to view its stock. Add a new location for warehouse or pickup points.
        </Text>

        {locations && locations.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.locationRow}
          >
            {locations.map((location) => {
              const isSelected = location.id === selectedLocationId;
              return (
                <Pressable
                  key={location.id}
                  onPress={() => setSelectedLocationId(location.id)}
                  style={[
                    styles.locationChip,
                    {
                      borderColor: isSelected ? theme.tint : theme.border,
                      backgroundColor: isSelected ? theme.tint : theme.background,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.locationCode,
                      { color: isSelected ? theme.card : theme.textPrimary },
                    ]}
                  >
                    {location.code}
                  </Text>
                  <Text
                    style={[
                      styles.locationName,
                      { color: isSelected ? theme.card : theme.textSecondary },
                    ]}
                    numberOfLines={1}
                  >
                    {location.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : (
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No locations yet. Add one to start tracking stock.
          </Text>
        )}

        <View style={[styles.divider, { borderColor: theme.border }]} />

        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
          Add location
        </Text>
        <TextInput
          value={locationName}
          onChangeText={setLocationName}
          placeholder="Location name"
          placeholderTextColor={theme.textSecondary}
          style={[
            styles.input,
            { borderColor: theme.border, backgroundColor: theme.background, color: theme.textPrimary },
          ]}
        />
        <TextInput
          value={locationCode}
          onChangeText={setLocationCode}
          placeholder="Code (e.g. CPT)"
          placeholderTextColor={theme.textSecondary}
          style={[
            styles.input,
            { borderColor: theme.border, backgroundColor: theme.background, color: theme.textPrimary },
          ]}
          autoCapitalize="characters"
        />
        <TextInput
          value={locationAddress}
          onChangeText={setLocationAddress}
          placeholder="Address (optional)"
          placeholderTextColor={theme.textSecondary}
          style={[
            styles.input,
            styles.multilineInput,
            { borderColor: theme.border, backgroundColor: theme.background, color: theme.textPrimary },
          ]}
          multiline
        />

        <Button
          text={createLocation.isPending ? "Saving..." : "Save Location"}
          onPress={handleCreateLocation}
          loading={createLocation.isPending}
        />
      </View>

      <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            Stock levels
          </Text>
          <FontAwesome name="cubes" size={18} color={theme.tint} />
        </View>
        <Text style={[styles.sectionHelper, { color: theme.textSecondary }]}>
          {selectedLocation
            ? `Editing stock for ${selectedLocation.name} (${selectedLocation.code}).`
            : "Select a location to edit stock."}
        </Text>

        {levelsLoading && selectedLocation ? (
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Loading stock levels...
          </Text>
        ) : null}

        {sortedProducts.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Add products before tracking stock.
          </Text>
        ) : (
          sortedProducts.map((product) => {
            const level = levelsByProduct.get(product.id);
            const onHand = Number(level?.on_hand ?? 0);
            const reserved = Number(level?.reserved ?? 0);
            const available = Math.max(onHand - reserved, 0);
            const input =
              stockInputs[product.id] ?? { onHand: "0", reserved: "0", reason: "" };
            const trackingEnabled = product.track_inventory ?? true;

            return (
              <View
                key={product.id}
                style={[
                  styles.productCard,
                  { borderColor: theme.border, backgroundColor: theme.background },
                ]}
              >
                <View style={styles.productHeader}>
                  <View style={styles.productDetails}>
                    <Text style={[styles.productName, { color: theme.textPrimary }]}>
                      {product.name}
                    </Text>
                    {!!product.sku && (
                      <Text style={[styles.productMeta, { color: theme.textSecondary }]}>
                        SKU: {product.sku}
                      </Text>
                    )}
                    {!!product.barcode && (
                      <Text style={[styles.productMeta, { color: theme.textSecondary }]}>
                        Barcode: {product.barcode}
                      </Text>
                    )}
                    <Text style={[styles.productMeta, { color: theme.textSecondary }]}>
                      Unit cost: {formatCurrencyZAR(Number(product.unit_cost ?? 0))}
                    </Text>
                  </View>
                  <View style={styles.productMetrics}>
                    <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
                      Available
                    </Text>
                    <Text
                      style={[
                        styles.metricValue,
                        { color: available > 0 ? theme.success : theme.error },
                      ]}
                    >
                      {available}
                    </Text>
                  </View>
                </View>

                {!trackingEnabled ? (
                  <Text style={[styles.helperText, { color: theme.textSecondary }]}>
                    Inventory tracking is disabled for this product. Enable tracking in the product editor.
                  </Text>
                ) : (
                  <>
                    <View style={styles.stockRow}>
                      <View style={styles.stockField}>
                        <Text style={[styles.label, { color: theme.textSecondary }]}>
                          On hand
                        </Text>
                        <TextInput
                          value={input.onHand}
                          onChangeText={(value) =>
                            updateStockInput(product.id, "onHand", value)
                          }
                          keyboardType="number-pad"
                          style={[
                            styles.input,
                            styles.stockInput,
                            {
                              borderColor: theme.border,
                              backgroundColor: theme.card,
                              color: theme.textPrimary,
                            },
                          ]}
                        />
                      </View>
                      <View style={styles.stockField}>
                        <Text style={[styles.label, { color: theme.textSecondary }]}>
                          Reserved
                        </Text>
                        <TextInput
                          value={input.reserved}
                          onChangeText={(value) =>
                            updateStockInput(product.id, "reserved", value)
                          }
                          keyboardType="number-pad"
                          style={[
                            styles.input,
                            styles.stockInput,
                            {
                              borderColor: theme.border,
                              backgroundColor: theme.card,
                              color: theme.textPrimary,
                            },
                          ]}
                        />
                      </View>
                    </View>

                    <Text style={[styles.label, { color: theme.textSecondary }]}>
                      Adjustment note
                    </Text>
                    <TextInput
                      value={input.reason}
                      onChangeText={(value) => updateStockReason(product.id, value)}
                      placeholder="Optional reason for this change"
                      placeholderTextColor={theme.textSecondary}
                      style={[
                        styles.input,
                        styles.reasonInput,
                        {
                          borderColor: theme.border,
                          backgroundColor: theme.card,
                          color: theme.textPrimary,
                        },
                      ]}
                    />

                    <Pressable
                      onPress={() => handleSaveStock(product.id)}
                      disabled={savingProductId === product.id || !selectedLocationId}
                      style={[
                        styles.actionButton,
                        {
                          backgroundColor:
                            savingProductId === product.id || !selectedLocationId
                              ? theme.placeholder
                              : theme.tint,
                        },
                      ]}
                    >
                      <Text style={[styles.actionButtonText, { color: theme.textPrimary }]}>
                        {savingProductId === product.id ? "Saving..." : "Save Stock"}
                      </Text>
                    </Pressable>
                  </>
                )}
              </View>
            );
          })
        )}
      </View>

      <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            Suppliers
          </Text>
          <FontAwesome name="truck" size={18} color={theme.tint} />
        </View>
        <Text style={[styles.sectionHelper, { color: theme.textSecondary }]}>
          Maintain supplier contacts and lead times for replenishment.
        </Text>

        {suppliersLoading ? (
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Loading suppliers...
          </Text>
        ) : suppliers && suppliers.length > 0 ? (
          suppliers.map((supplier) => (
            <View
              key={supplier.id}
              style={[
                styles.supplierCard,
                { borderColor: theme.border, backgroundColor: theme.background },
              ]}
            >
              <View style={styles.supplierDetails}>
                <Text style={[styles.supplierName, { color: theme.textPrimary }]}>
                  {supplier.name}
                </Text>
                {supplier.contact_email ? (
                  <Text style={[styles.supplierMeta, { color: theme.textSecondary }]}>
                    Email: {supplier.contact_email}
                  </Text>
                ) : null}
                {supplier.contact_phone ? (
                  <Text style={[styles.supplierMeta, { color: theme.textSecondary }]}>
                    Phone: {supplier.contact_phone}
                  </Text>
                ) : null}
                <Text style={[styles.supplierMeta, { color: theme.textSecondary }]}>
                  Lead time: {supplier.lead_time_days} day(s)
                </Text>
              </View>
              <Pressable
                onPress={() => handleToggleSupplier(supplier.id, !supplier.is_active)}
                disabled={savingSupplierId === supplier.id}
                style={[
                  styles.statusChip,
                  {
                    borderColor: supplier.is_active ? theme.tint : theme.border,
                    backgroundColor: supplier.is_active ? theme.tint : theme.card,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusChipText,
                    { color: supplier.is_active ? theme.card : theme.textSecondary },
                  ]}
                >
                  {savingSupplierId === supplier.id
                    ? "Saving..."
                    : supplier.is_active
                      ? "Active"
                      : "Inactive"}
                </Text>
              </Pressable>
            </View>
          ))
        ) : (
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No suppliers yet. Add one below.
          </Text>
        )}

        <View style={[styles.divider, { borderColor: theme.border }]} />

        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
          Add supplier
        </Text>
        <TextInput
          value={supplierName}
          onChangeText={setSupplierName}
          placeholder="Supplier name"
          placeholderTextColor={theme.textSecondary}
          style={[
            styles.input,
            { borderColor: theme.border, backgroundColor: theme.background, color: theme.textPrimary },
          ]}
        />
        <TextInput
          value={supplierEmail}
          onChangeText={setSupplierEmail}
          placeholder="Contact email (optional)"
          placeholderTextColor={theme.textSecondary}
          keyboardType="email-address"
          autoCapitalize="none"
          style={[
            styles.input,
            { borderColor: theme.border, backgroundColor: theme.background, color: theme.textPrimary },
          ]}
        />
        <TextInput
          value={supplierPhone}
          onChangeText={setSupplierPhone}
          placeholder="Contact phone (optional)"
          placeholderTextColor={theme.textSecondary}
          keyboardType="phone-pad"
          style={[
            styles.input,
            { borderColor: theme.border, backgroundColor: theme.background, color: theme.textPrimary },
          ]}
        />
        <TextInput
          value={supplierLeadTime}
          onChangeText={(value) => setSupplierLeadTime(sanitizeIntegerInput(value))}
          placeholder="Lead time days"
          placeholderTextColor={theme.textSecondary}
          keyboardType="number-pad"
          style={[
            styles.input,
            { borderColor: theme.border, backgroundColor: theme.background, color: theme.textPrimary },
          ]}
        />

        <Button
          text={createSupplier.isPending ? "Saving..." : "Save Supplier"}
          onPress={handleCreateSupplier}
          loading={createSupplier.isPending}
        />
      </View>

      <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            Reorder rules
          </Text>
          <FontAwesome name="repeat" size={18} color={theme.tint} />
        </View>
        <Text style={[styles.sectionHelper, { color: theme.textSecondary }]}>
          Set reorder points and safety stock for the selected location.
        </Text>

        {reorderRulesLoading && selectedLocation ? (
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Loading reorder rules...
          </Text>
        ) : null}

        {!selectedLocation ? (
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Select a location to manage reorder rules.
          </Text>
        ) : trackedProducts.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No tracked products available yet.
          </Text>
        ) : (
          trackedProducts.map((product) => {
            const level = levelsByProduct.get(product.id);
            const available = Math.max(
              Number(level?.on_hand ?? 0) - Number(level?.reserved ?? 0),
              0,
            );
            const input = ruleInputs[product.id] ?? {
              reorderPoint: "0",
              safetyStock: "0",
              leadTimeDays: "0",
              supplierId: null,
              isActive: true,
            };
            const selectedSupplier = suppliers?.find(
              (supplier) => supplier.id === input.supplierId,
            );

            return (
              <View
                key={product.id}
                style={[
                  styles.productCard,
                  { borderColor: theme.border, backgroundColor: theme.background },
                ]}
              >
                <View style={styles.productHeader}>
                  <View style={styles.productDetails}>
                    <Text style={[styles.productName, { color: theme.textPrimary }]}>
                      {product.name}
                    </Text>
                    {!!product.sku && (
                      <Text style={[styles.productMeta, { color: theme.textSecondary }]}>
                        SKU: {product.sku}
                      </Text>
                    )}
                    {!!selectedSupplier ? (
                      <Text style={[styles.productMeta, { color: theme.textSecondary }]}>
                        Supplier: {selectedSupplier.name}
                      </Text>
                    ) : (
                      <Text style={[styles.productMeta, { color: theme.textSecondary }]}>
                        Supplier: None
                      </Text>
                    )}
                  </View>
                  <View style={styles.productMetrics}>
                    <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
                      Available
                    </Text>
                    <Text
                      style={[
                        styles.metricValue,
                        { color: available > 0 ? theme.success : theme.error },
                      ]}
                    >
                      {available}
                    </Text>
                  </View>
                </View>

                <View style={styles.stockRow}>
                  <View style={styles.stockField}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>
                      Reorder point
                    </Text>
                    <TextInput
                      value={input.reorderPoint}
                      onChangeText={(value) =>
                        updateRuleInput(product.id, {
                          reorderPoint: sanitizeIntegerInput(value),
                        })
                      }
                      keyboardType="number-pad"
                      style={[
                        styles.input,
                        styles.stockInput,
                        {
                          borderColor: theme.border,
                          backgroundColor: theme.card,
                          color: theme.textPrimary,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.stockField}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>
                      Safety stock
                    </Text>
                    <TextInput
                      value={input.safetyStock}
                      onChangeText={(value) =>
                        updateRuleInput(product.id, {
                          safetyStock: sanitizeIntegerInput(value),
                        })
                      }
                      keyboardType="number-pad"
                      style={[
                        styles.input,
                        styles.stockInput,
                        {
                          borderColor: theme.border,
                          backgroundColor: theme.card,
                          color: theme.textPrimary,
                        },
                      ]}
                    />
                  </View>
                </View>

                <Text style={[styles.label, { color: theme.textSecondary }]}>
                  Lead time days
                </Text>
                <TextInput
                  value={input.leadTimeDays}
                  onChangeText={(value) =>
                    updateRuleInput(product.id, {
                      leadTimeDays: sanitizeIntegerInput(value),
                    })
                  }
                  keyboardType="number-pad"
                  style={[
                    styles.input,
                    {
                      borderColor: theme.border,
                      backgroundColor: theme.card,
                      color: theme.textPrimary,
                    },
                  ]}
                />

                <Text style={[styles.label, { color: theme.textSecondary }]}>
                  Supplier
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.locationRow}
                >
                  <Pressable
                    onPress={() => updateRuleInput(product.id, { supplierId: null })}
                    style={[
                      styles.locationChip,
                      {
                        borderColor: input.supplierId ? theme.border : theme.tint,
                        backgroundColor: input.supplierId ? theme.background : theme.tint,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.locationCode,
                        { color: input.supplierId ? theme.textPrimary : theme.card },
                      ]}
                    >
                      None
                    </Text>
                  </Pressable>
                  {activeSuppliers.map((supplier) => {
                    const isSelected = supplier.id === input.supplierId;
                    return (
                      <Pressable
                        key={supplier.id}
                        onPress={() =>
                          updateRuleInput(product.id, { supplierId: supplier.id })
                        }
                        style={[
                          styles.locationChip,
                          {
                            borderColor: isSelected ? theme.tint : theme.border,
                            backgroundColor: isSelected ? theme.tint : theme.background,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.locationCode,
                            { color: isSelected ? theme.card : theme.textPrimary },
                          ]}
                        >
                          {supplier.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <View style={styles.ruleFooter}>
                  <Pressable
                    onPress={() =>
                      updateRuleInput(product.id, { isActive: !input.isActive })
                    }
                    style={[
                      styles.statusChip,
                      {
                        borderColor: input.isActive ? theme.tint : theme.border,
                        backgroundColor: input.isActive ? theme.tint : theme.card,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusChipText,
                        { color: input.isActive ? theme.card : theme.textSecondary },
                      ]}
                    >
                      {input.isActive ? "Active" : "Paused"}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handleSaveRule(product.id)}
                    disabled={savingRuleProductId === product.id || !selectedLocationId}
                    style={[
                      styles.actionButton,
                      {
                        backgroundColor:
                          savingRuleProductId === product.id || !selectedLocationId
                            ? theme.placeholder
                            : theme.tint,
                      },
                    ]}
                  >
                    <Text style={[styles.actionButtonText, { color: theme.textPrimary }]}>
                      {savingRuleProductId === product.id ? "Saving..." : "Save Rule"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </View>

      <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            Inventory alerts
          </Text>
          <FontAwesome name="exclamation-triangle" size={18} color={theme.tint} />
        </View>
        <Text style={[styles.sectionHelper, { color: theme.textSecondary }]}>
          Generate and acknowledge low stock alerts for this location.
        </Text>

        <Button
          text={generateAlerts.isPending ? "Generating..." : "Generate Alerts"}
          onPress={handleGenerateAlerts}
          loading={generateAlerts.isPending}
        />

        {alertsLoading && selectedLocation ? (
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Loading alerts...
          </Text>
        ) : null}

        {!selectedLocation ? (
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Select a location to view alerts.
          </Text>
        ) : inventoryAlerts && inventoryAlerts.length > 0 ? (
          inventoryAlerts.map((alert) => {
            const productName =
              alert.products?.name ?? `Product #${alert.product_id}`;
            const createdAt = new Date(alert.created_at);
            const createdLabel = Number.isNaN(createdAt.getTime())
              ? "Unknown time"
              : createdAt.toLocaleString("en-ZA", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                });
            return (
              <View
                key={alert.id}
                style={[
                  styles.alertRow,
                  { borderColor: theme.border, backgroundColor: theme.background },
                ]}
              >
                <View style={styles.alertDetails}>
                  <Text style={[styles.alertTitle, { color: theme.textPrimary }]}>
                    {productName}
                  </Text>
                  <Text style={[styles.alertMeta, { color: theme.textSecondary }]}>
                    {formatAlertStatus(alert.severity)} severity - {createdLabel}
                  </Text>
                  <Text style={[styles.alertMeta, { color: theme.textSecondary }]}>
                    Available: {alert.available} (RP {alert.reorder_point}, SS{" "}
                    {alert.safety_stock})
                  </Text>
                  <Text style={[styles.alertMeta, { color: theme.textSecondary }]}>
                    Status: {formatAlertStatus(alert.status)}
                  </Text>
                </View>
                {alert.status === "active" ? (
                  <Pressable
                    onPress={() => handleAcknowledgeAlert(alert.id)}
                    disabled={acknowledgingAlertId === alert.id}
                    style={[
                      styles.statusChip,
                      {
                        borderColor: theme.tint,
                        backgroundColor: theme.tint,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusChipText,
                        { color: theme.card },
                      ]}
                    >
                      {acknowledgingAlertId === alert.id
                        ? "Saving..."
                        : "Acknowledge"}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })
        ) : (
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No active alerts.
          </Text>
        )}
      </View>

      <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            Recent transactions
          </Text>
          <FontAwesome name="history" size={18} color={theme.tint} />
        </View>
        <Text style={[styles.sectionHelper, { color: theme.textSecondary }]}>
          Audit trail for the selected location.
        </Text>

        {transactionsLoading && selectedLocation ? (
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Loading recent transactions...
          </Text>
        ) : null}

        {recentTransactions && recentTransactions.length > 0 ? (
          recentTransactions.map((transaction) => {
            const productName =
              transaction.products?.name ??
              `Product #${transaction.product_id}`;
            const productSku = transaction.products?.sku;
            const createdAt = new Date(transaction.created_at);
            const createdAtLabel = Number.isNaN(createdAt.getTime())
              ? "Unknown time"
              : createdAt.toLocaleString("en-ZA", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                });
            const movementLabel = formatMovementLabel(transaction.movement_type);
            return (
              <View
                key={transaction.id}
                style={[
                  styles.transactionRow,
                  { borderColor: theme.border, backgroundColor: theme.background },
                ]}
              >
                <View style={styles.transactionDetails}>
                  <Text style={[styles.transactionTitle, { color: theme.textPrimary }]}>
                    {productName}
                  </Text>
                  <Text style={[styles.transactionMeta, { color: theme.textSecondary }]}>
                    {movementLabel} - {createdAtLabel}
                  </Text>
                  {productSku ? (
                    <Text style={[styles.transactionMeta, { color: theme.textSecondary }]}>
                      SKU: {productSku}
                    </Text>
                  ) : null}
                  {transaction.reason ? (
                    <Text style={[styles.transactionNote, { color: theme.textSecondary }]}>
                      Note: {transaction.reason}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.transactionMetrics}>
                  <Text style={[styles.transactionDelta, { color: theme.textPrimary }]}>
                    On hand {formatDelta(transaction.delta_on_hand)}
                  </Text>
                  <Text style={[styles.transactionDelta, { color: theme.textPrimary }]}>
                    Reserved {formatDelta(transaction.delta_reserved)}
                  </Text>
                </View>
              </View>
            );
          })
        ) : (
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No transactions logged yet.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
    width: "100%",
    maxWidth: 1240,
    alignSelf: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
  },
  notice: {
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 18,
  },
  sectionCard: {
    marginTop: 18,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  sectionHelper: {
    fontSize: 13,
    lineHeight: 18,
  },
  locationRow: {
    gap: 10,
    paddingVertical: 6,
  },
  locationChip: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 110,
  },
  locationCode: {
    fontSize: 12,
    fontWeight: "700",
  },
  locationName: {
    fontSize: 12,
    marginTop: 2,
  },
  supplierCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  supplierDetails: {
    flex: 1,
    gap: 4,
  },
  supplierName: {
    fontSize: 14,
    fontWeight: "700",
  },
  supplierMeta: {
    fontSize: 12,
  },
  emptyText: {
    fontSize: 13,
  },
  divider: {
    borderTopWidth: 1,
    marginVertical: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  productCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  productHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  productDetails: {
    flex: 1,
    gap: 4,
  },
  productName: {
    fontSize: 16,
    fontWeight: "700",
  },
  productMeta: {
    fontSize: 12,
  },
  productMetrics: {
    alignItems: "flex-end",
    justifyContent: "center",
    minWidth: 80,
  },
  metricLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 4,
  },
  stockRow: {
    flexDirection: "row",
    gap: 12,
  },
  stockField: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
  statusChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: "700",
  },
  stockInput: {
    marginBottom: 0,
  },
  reasonInput: {
    marginBottom: 4,
  },
  actionButton: {
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center",
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  helperText: {
    fontSize: 12,
    lineHeight: 18,
  },
  ruleFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 8,
  },
  transactionRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  transactionDetails: {
    flex: 1,
    gap: 4,
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  transactionMeta: {
    fontSize: 12,
  },
  transactionNote: {
    fontSize: 12,
    lineHeight: 16,
  },
  transactionMetrics: {
    alignItems: "flex-end",
    justifyContent: "center",
    minWidth: 90,
    gap: 4,
  },
  transactionDelta: {
    fontSize: 12,
    fontWeight: "600",
  },
  alertRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  alertDetails: {
    flex: 1,
    gap: 4,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  alertMeta: {
    fontSize: 12,
  },
});
