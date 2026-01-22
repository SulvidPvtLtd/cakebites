import Button from "@/src/components/Button";
import React, { useCallback, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";

const MAX_NAME_LENGTH = 50;

const CreateProductScreen = () => {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetFields = () => {
    setName("");
    setPrice("");
    setError("");
  };

  const validateInputs = (): boolean => {
    setError("");
    const trimmedName = name.trim();
    const trimmedPrice = price.trim();
    const parsedPrice = Number(trimmedPrice);

    if (!trimmedName) {
      setError("Product name is required.");
      return false;
    }

    // Prevent unsafe characters (basic XSS defense)
    if (!/^[a-zA-Z0-9\s\-']+$/.test(trimmedName)) {
      setError("Name contains invalid characters.");
      return false;
    }

    if (trimmedName.length > MAX_NAME_LENGTH) {
      setError(`Name must be under ${MAX_NAME_LENGTH} characters.`);
      return false;
    }

    if (!trimmedPrice) {
      setError("Price is required.");
      return false;
    }

    if (!Number.isFinite(parsedPrice)) {
      setError("Price must be a valid number.");
      return false;
    }

    if (parsedPrice <= 0) {
      setError("Price must be greater than 0.");
      return false;
    }

    return true;
  };

  const onCreate = useCallback(() => {
    if (isSubmitting) return;

    if (!validateInputs()) {
      return;
    };

    try {
      setIsSubmitting(true);

      console.warn("Create product:", {
        name: name.trim(),
        price: Number(price),
      });

      // TODO: Save to database / API

      resetFields();
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to create product.");
    } finally {
      setIsSubmitting(false);
    }
  }, [name, price, isSubmitting]);

  return (
    <View style={styles.container}>
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
        value={price}
        onChangeText={setPrice}
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
