import Button from "@/src/components/Button";
import { defaultPizzaImage } from "@/src/components/ProductListItem";
import Colors from "@/src/constants/Colors";
import * as ImagePicker from "expo-image-picker";
import { Stack } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, Image, StyleSheet, Text, TextInput, View } from "react-native";

const MAX_NAME_LENGTH = 50;

const CreateProductScreen = () => {
  const [name, setName] = useState("");
  const [priceRaw, setPriceRaw] = useState(""); // User input
  const [error, setError] = useState(""); // Single error for simplicity
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [image, setImage] = useState<string | null>(null);

  const resetFields = () => {
    setName("");
    setPriceRaw("");
    setError("");
    setImage(null);
  };

  /** Parse and validate price as positive float */
  const parsePrice = useCallback((input: string): number | null => {
    if (!input || !input.trim()) return null;

    const normalized = input.trim().replace(",", "."); // support comma decimal
    if (!/^\d+(\.\d+)?$/.test(normalized)) return null; // only valid digits + optional decimal

    const value = Number(normalized);
    return value > 0 ? value : null;
  }, []);

  const priceValue = useMemo(() => parsePrice(priceRaw), [priceRaw, parsePrice]);

  /** Validate name and price */
  const validateInputs = useCallback((): boolean => {
    const trimmedName = name.trim();
    const trimmedPrice = priceRaw.trim();

    if (!trimmedName) {
      setError("Product name is required.");
      return false;
    }

    if (trimmedName.length > MAX_NAME_LENGTH) {
      setError(`Name must be under ${MAX_NAME_LENGTH} characters.`);
      return false;
    }

    if (!/^[a-zA-Z0-9\s\-']+$/.test(trimmedName)) {
      setError("Name contains invalid characters.");
      return false;
    }

    if (!trimmedPrice) {
      setError("Price is required.");
      return false;
    }

    if (priceValue === null) {
      setError("Enter a valid positive price.");
      return false;
    }

    setError(""); // All good
    return true;
  }, [name, priceRaw, priceValue]);

  /** Build API-safe payload */
  const buildPayload = useCallback(() => ({
    name: name.trim(),
    price: priceValue!,
    image,
  }), [name, priceValue, image]);

  /** Handle create action */
  const onCreate = useCallback(() => {
    if (isSubmitting) return; // prevent double submit
    if (!validateInputs()) return;

    try {
      setIsSubmitting(true);

      const payload = buildPayload();
      console.warn("Create product payload:", payload);

      // TODO: Save to database / API

      resetFields();
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to create product.");
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, validateInputs, buildPayload]);

  /** Pick image from library */
  const pickImage = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Permission to access media library is required.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Create Product" }} />

      <Image source={{ uri: image || defaultPizzaImage }} style={styles.image} />

      <Text onPress={pickImage} style={styles.textButton}>
        Select image
      </Text>

      <Text style={styles.label}>Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Product name"
        style={styles.input}
        maxLength={MAX_NAME_LENGTH}
        autoCapitalize="words"
      />

      <Text style={styles.label}>Price ($)</Text>
      <TextInput
        value={priceRaw}
        onChangeText={setPriceRaw}
        placeholder="9.99"
        style={styles.input}
        keyboardType="decimal-pad"
      />

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Button
        onPress={onCreate}
        text={isSubmitting ? "Creating..." : "Create"}
        disabled={isSubmitting}
      />
    </View>
  );
};

export default CreateProductScreen;

const styles = StyleSheet.create({
  container: {
    padding: 10,
  },
  image: {
    width: "50%",
    aspectRatio: 1,
    alignSelf: "center",
    marginBottom: 20,
  },
  textButton: {
    alignSelf: "center",
    fontWeight: "bold",
    color: Colors.light.tint,
    marginVertical: 10,
  },
  label: {
    color: "gray",
    fontSize: 16,
  },
  input: {
    borderWidth: 0.5,
    borderColor: "gray",
    padding: 10,
    marginTop: 5,
    marginBottom: 20,
    backgroundColor: "white",
    borderRadius: 5,
  },
  error: {
    color: "red",
    textAlign: "center",
    marginBottom: 10,
  },
});
