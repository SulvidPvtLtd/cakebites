import {
  useDeliverySettings,
  useUpdateDeliverySettings,
} from "@/src/api/delivery";
import { useInventoryLocations } from "@/src/api/inventory";
import Button from "@/src/components/Button";
import LoadingState from "@/src/components/LoadingState";
import Colors from "@/src/constants/Colors";
import { useEffect, useState } from "react";
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

export default function DeliverySettingsScreen() {
  const scheme = useColorScheme() ?? "light";
  const theme = Colors[scheme];
  const { data: deliverySettings, isLoading, error } = useDeliverySettings();
  const {
    data: locations,
    isLoading: locationsLoading,
    error: locationsError,
  } = useInventoryLocations();
  const updateDeliverySettings = useUpdateDeliverySettings();

  const [collectionAddress, setCollectionAddress] = useState("");
  const [deliveryRateInput, setDeliveryRateInput] = useState("");
  const [fulfillmentLocationId, setFulfillmentLocationId] = useState<number | null>(
    null,
  );
  const [hasInitializedLocation, setHasInitializedLocation] = useState(false);

  useEffect(() => {
    setCollectionAddress(deliverySettings?.collection_address ?? "");
    setDeliveryRateInput(
      deliverySettings?.delivery_rate !== undefined &&
        deliverySettings?.delivery_rate !== null
        ? String(deliverySettings.delivery_rate)
        : "",
    );
  }, [deliverySettings]);

  useEffect(() => {
    if (hasInitializedLocation) return;
    const existing = deliverySettings?.fulfillment_location_id ?? null;
    if (existing) {
      setFulfillmentLocationId(existing);
      setHasInitializedLocation(true);
      return;
    }
    if (locations && locations.length > 0) {
      setFulfillmentLocationId(locations[0].id);
      setHasInitializedLocation(true);
    }
  }, [deliverySettings?.fulfillment_location_id, hasInitializedLocation, locations]);

  const selectedLocation = locations?.find(
    (location) => location.id === fulfillmentLocationId,
  );

  const handleSave = async () => {
    const nextCollectionAddress = collectionAddress.trim();
    const nextRate = Number(deliveryRateInput.trim());

    if (!nextCollectionAddress) {
      Alert.alert(
        "Collection address required",
        "Enter the administrator collection address.",
      );
      return;
    }

    if (!Number.isFinite(nextRate) || nextRate <= 0) {
      Alert.alert("Delivery rate required", "Enter a valid delivery rate per kilometre.");
      return;
    }

    if (locations && locations.length > 0 && !fulfillmentLocationId) {
      Alert.alert(
        "Select a fulfilment location",
        "Choose which inventory location should be used for order fulfilment.",
      );
      return;
    }

    try {
      await updateDeliverySettings.mutateAsync({
        collection_address: nextCollectionAddress,
        delivery_rate: nextRate,
        fulfillment_location_id: fulfillmentLocationId ?? null,
      });
      Alert.alert(
        "Delivery settings updated",
        "Distance quotes will use the new rate immediately.",
      );
    } catch (err) {
      Alert.alert(
        "Unable to save delivery settings",
        err instanceof Error ? err.message : "Please try again.",
      );
    }
  };

  if (isLoading) {
    return (
      <LoadingState
        title="Loading delivery settings"
        message="Fetching the current collection address and rate."
      />
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: theme.textPrimary }]}>
        Delivery Settings
      </Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        Update the collection address and delivery rate used to calculate delivery
        fees.
      </Text>

      {error && (
        <View style={[styles.notice, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <Text style={[styles.noticeText, { color: theme.textPrimary }]}>
            {error.message}
          </Text>
        </View>
      )}
      {locationsError && (
        <View style={[styles.notice, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <Text style={[styles.noticeText, { color: theme.textPrimary }]}>
            {locationsError.message}
          </Text>
        </View>
      )}

      <View style={styles.form}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          Collection address
        </Text>
        <TextInput
          value={collectionAddress}
          onChangeText={setCollectionAddress}
          multiline
          style={[
            styles.input,
            styles.addressInput,
            { borderColor: theme.border, backgroundColor: theme.card, color: theme.textPrimary },
          ]}
        />

        <Text style={[styles.label, { color: theme.textSecondary }]}>
          Delivery rate per km (R)
        </Text>
        <TextInput
          value={deliveryRateInput}
          onChangeText={setDeliveryRateInput}
          keyboardType="decimal-pad"
          style={[
            styles.input,
            { borderColor: theme.border, backgroundColor: theme.card, color: theme.textPrimary },
          ]}
        />

        <Text style={[styles.helper, { color: theme.textSecondary }]}>
          Delivery fee = distance (km) x rate. This amount is added to the order total.
        </Text>

        <Text style={[styles.label, { color: theme.textSecondary }]}>
          Fulfilment location
        </Text>
        {locationsLoading ? (
          <Text style={[styles.helper, { color: theme.textSecondary }]}>
            Loading locations...
          </Text>
        ) : locations && locations.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.locationRow}
          >
            {locations.map((location) => {
              const isSelected = location.id === fulfillmentLocationId;
              return (
                <Pressable
                  key={location.id}
                  onPress={() => setFulfillmentLocationId(location.id)}
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
          <Text style={[styles.helper, { color: theme.textSecondary }]}>
            Add an inventory location first in the Inventory tab.
          </Text>
        )}

        {selectedLocation ? (
          <Text style={[styles.helper, { color: theme.textSecondary }]}>
            Orders will reserve stock from {selectedLocation.name} ({selectedLocation.code}).
          </Text>
        ) : null}

        <Button
          text={updateDeliverySettings.isPending ? "Saving..." : "Save Delivery Settings"}
          onPress={handleSave}
          loading={updateDeliverySettings.isPending}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
  },
  notice: {
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 18,
  },
  form: {
    marginTop: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 14,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  addressInput: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  helper: {
    marginTop: 10,
    fontSize: 12,
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
    minWidth: 140,
  },
  locationCode: {
    fontSize: 11,
    fontWeight: "700",
  },
  locationName: {
    fontSize: 12,
    marginTop: 2,
  },
});
