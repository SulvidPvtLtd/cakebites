// src/app/(admin)/menu/create.tsx
import Button from "@/src/components/Button";
import { defaultPizzaImage } from "@/src/components/ProductListItem";
import Colors from "@/src/constants/Colors";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const MAX_NAME_LENGTH = 50;

const CreateProductScreen = () => {
  const [name, setName] = useState("");
  const [priceRaw, setPriceRaw] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isUpdating = !!id;

  const resetForm = () => {
    setName("");
    setPriceRaw("");
    setImage(null);
    setError("");
  };

  const parsePrice = useCallback((input: string): number | null => {
    const normalized = input.trim().replace(",", ".");
    if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
    const value = Number(normalized);
    return value > 0 ? value : null;
  }, []);

  const priceValue = useMemo(
    () => parsePrice(priceRaw),
    [priceRaw, parsePrice],
  );

  const validate = useCallback(() => {
    const trimmedName = name.trim();

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

    if (!priceRaw.trim()) {
      setError("Price is required.");
      return false;
    }

    if (priceValue === null) {
      setError("Enter a valid positive price.");
      return false;
    }

    setError("");
    return true;
  }, [name, priceRaw, priceValue]);

  const pickImage = useCallback(async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission required", "Media access is required.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
      }
    } catch (err) {
      console.error("Image picker error:", err);
      Alert.alert("Error", "Failed to pick image.");
    }
  }, []);

  // CREATE
  const onCreate = useCallback(async () => {
    if (isSubmitting || isDeleting) return;
    if (!validate()) return;

    try {
      setIsSubmitting(true);

      const payload = {
        name: name.trim(),
        price: priceValue!,
        image,
      };

      console.log("Creating product:", payload);
      // TODO: API call to create product

      resetForm();
      Alert.alert("Success", "Product created successfully.");
    } catch (err) {
      console.error("Create error:", err);
      Alert.alert("Error", "Failed to create product.");
    } finally {
      setIsSubmitting(false);
    }
  }, [validate, name, priceValue, image, isSubmitting, isDeleting]);

  // UPDATE
  const onUpdate = useCallback(async () => {
    if (!id) return;
    if (isSubmitting || isDeleting) return;
    if (!validate()) return;

    try {
      setIsSubmitting(true);

      const payload = {
        id,
        name: name.trim(),
        price: priceValue!,
        image,
      };

      console.log("Updating product:", payload);
      // TODO: API call to update product

      resetForm();
      Alert.alert("Success", "Product updated successfully.");
    } catch (err) {
      console.error("Update error:", err);
      Alert.alert("Error", "Failed to update product.");
    } finally {
      setIsSubmitting(false);
    }
  }, [validate, name, priceValue, image, isSubmitting, isDeleting, id]);

  // DELETE
  const onDelete = useCallback(async () => {
    if (!id) return;
    if (isSubmitting || isDeleting) return;

    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this product? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setIsDeleting(true);
              console.log("Deleting product with id:", id);
              // TODO: API call to delete product

              resetForm();
              router.back(); // navigate back after deletion
              Alert.alert("Deleted", "Product deleted successfully.");
            } catch (err) {
              console.error("Delete error:", err);
              Alert.alert("Error", "Failed to delete product.");
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  }, [id, isSubmitting, isDeleting, router]);

  const buttonText = useMemo(() => {
    if (isSubmitting) return isUpdating ? "Updating..." : "Creating...";
    return isUpdating ? "Update" : "Create";
  }, [isSubmitting, isUpdating]);

  const handleButtonPress = () => {
    if (isUpdating) {
      onUpdate();
    } else {
      onCreate();
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen
        options={{ title: isUpdating ? "Update Product" : "Create Product" }}
      />

      <Pressable style={styles.imageWrapper} onPress={pickImage}>
        <Image
          source={{ uri: image || defaultPizzaImage }}
          style={styles.image}
        />
        <Text style={styles.imageHint}>Tap to select image</Text>
      </Pressable>

      <View style={styles.formCard}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Product name"
          style={styles.input}
          maxLength={MAX_NAME_LENGTH}
          autoCapitalize="words"
          keyboardType="default"
        />

        <Text style={styles.label}>Price ($)</Text>
        <TextInput
          value={priceRaw}
          onChangeText={setPriceRaw}
          placeholder="9.99"
          keyboardType="decimal-pad"
          style={styles.input}
        />

        {!!error && <Text style={styles.error}>{error}</Text>}

        <Button
          onPress={handleButtonPress}
          text={buttonText}
          disabled={isSubmitting || isDeleting}
        />

        {isUpdating && (
          <Pressable onPress={onDelete} style={styles.deleteWrapper}>
            <Text style={styles.deleteText}>
              {isDeleting ? "Deleting..." : "Delete Product"}
            </Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
};

export default CreateProductScreen;

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#F7F7F7",
  },
  imageWrapper: {
    alignItems: "center",
    marginBottom: 24,
  },
  image: {
    width: 180,
    height: 180,
    borderRadius: 16,
    backgroundColor: "transparent",
  },
  imageHint: {
    marginTop: 8,
    color: Colors.light.tint,
    fontWeight: "600",
  },
  formCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  label: {
    color: "#666",
    marginBottom: 6,
    fontSize: 14,
    fontWeight: "500",
  },
  input: {
    backgroundColor: "#FAFAFA",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#DDD",
    marginBottom: 16,
    fontSize: 16,
  },
  error: {
    color: "#D32F2F",
    textAlign: "center",
    marginBottom: 12,
  },
  deleteWrapper: {
    marginTop: 16,
    alignItems: "center",
  },
  deleteText: {
    color: "#D32F2F",
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});
