import {
  useDeliverySettings,
  useUpdateDeliverySettings,
} from "@/src/api/delivery";
import Button from "@/src/components/Button";
import LoadingState from "@/src/components/LoadingState";
import Colors from "@/src/constants/Colors";
import { useEffect, useState } from "react";
import {
  Alert,
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
  const updateDeliverySettings = useUpdateDeliverySettings();

  const [collectionAddress, setCollectionAddress] = useState("");
  const [deliveryRateInput, setDeliveryRateInput] = useState("");

  useEffect(() => {
    setCollectionAddress(deliverySettings?.collection_address ?? "");
    setDeliveryRateInput(
      deliverySettings?.delivery_rate !== undefined &&
        deliverySettings?.delivery_rate !== null
        ? String(deliverySettings.delivery_rate)
        : "",
    );
  }, [deliverySettings]);

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

    try {
      await updateDeliverySettings.mutateAsync({
        collection_address: nextCollectionAddress,
        delivery_rate: nextRate,
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
});
