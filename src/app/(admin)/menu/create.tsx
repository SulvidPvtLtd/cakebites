// src/app/(admin)/menu/create.tsx
import {
  useDeleteProduct,
  useInsertProduct,
  useProduct,
  useUpdateProduct,
} from "@/src/api/products";
import Button from "@/src/components/Button";
import {
  defaultPizzaImage,
  getSafeImageUrl,
} from "@/src/components/ProductListItem";
import Colors from "@/src/constants/Colors";
import { supabase } from "@/src/lib/supabase";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
const PRODUCT_IMAGE_BUCKET = "product-images";

type PickedImageAsset = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
};

const isLocalAssetUri = (uri: string) =>
  /^(file:\/\/|content:\/\/|ph:\/\/|assets-library:\/\/)/i.test(uri);

const getFileExt = (asset: PickedImageAsset) => {
  const fromName = asset.fileName?.split(".").pop()?.toLowerCase();
  if (fromName) return fromName;

  const fromMime = asset.mimeType?.split("/").pop()?.toLowerCase();
  if (fromMime) return fromMime;

  const fromUri = asset.uri.split(".").pop()?.split("?")[0]?.toLowerCase();
  if (fromUri) return fromUri;

  return "jpg";
};

const CreateProductScreen = () => {
  
  const [name, setName] = useState("");
  const [priceRaw, setPriceRaw] = useState("");
  const [description, setDescription] = useState("");
  const [inStock, setInStock] = useState(true);
  const [image, setImage] = useState<string | null>(null);
  const [pickedImageAsset, setPickedImageAsset] = useState<PickedImageAsset | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const router = useRouter();
  const { id: idParam } = useLocalSearchParams<{ id?: string | string[] }>();
  const idString = typeof idParam === "string" ? idParam : idParam?.[0];
  const productId = useMemo(() => {
    if (!idString) return null;
    const parsed = Number(idString);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [idString]);

  const isUpdating = productId !== null;

  const { mutateAsync: insertProduct } = useInsertProduct();
  const { mutateAsync: updateProduct } = useUpdateProduct();
  const { mutateAsync: deleteProduct } = useDeleteProduct();
  const { data: productToEdit } = useProduct(productId ?? -1);
  const [hydratedProductId, setHydratedProductId] = useState<number | null>(
    null,
  );

  useEffect(() => {
    if (!isUpdating || !productToEdit) return;
    if (hydratedProductId === productToEdit.id) return;

    setName(productToEdit.name ?? "");
    setPriceRaw(
      typeof productToEdit.price === "number"
        ? String(productToEdit.price)
        : "",
    );
    setDescription(productToEdit.description?.trim() ?? "");
    setInStock(productToEdit.in_stock ?? true);
    setImage(productToEdit.image ?? null);
    setPickedImageAsset(null);
    setHydratedProductId(productToEdit.id);
  }, [hydratedProductId, isUpdating, productToEdit]);

  const resetForm = () => {
    setName("");
    setPriceRaw("");
    setDescription("");
    setInStock(true);
    setImage(null);
    setPickedImageAsset(null);
    setError("");
    setHydratedProductId(null);
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
        mediaTypes: ["images"],
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        const picked: PickedImageAsset = {
          uri: asset.uri,
          mimeType: asset.mimeType ?? null,
          fileName: asset.fileName ?? null,
        };
        setImage(asset.uri);
        setPickedImageAsset(picked);
      }
    } catch (err) {
      console.error("Image picker error:", err);
      Alert.alert("Error", "Failed to pick image.");
    }
  }, []);

  const uploadImageIfNeeded = useCallback(async () => {
    const uri = image?.trim();
    if (!uri) return null;

    if (!isLocalAssetUri(uri)) {
      return uri;
    }

    const asset: PickedImageAsset = pickedImageAsset ?? { uri };
    const extension = getFileExt(asset);
    const contentType = asset.mimeType ?? `image/${extension}`;
    const filePath = `products/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${extension}`;

    const response = await fetch(asset.uri);
    if (!response.ok) {
      throw new Error("Failed to read selected image file.");
    }

    const arrayBuffer = await response.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .upload(filePath, arrayBuffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .getPublicUrl(filePath);

    if (!data?.publicUrl) {
      throw new Error("Could not generate public image URL.");
    }

    return data.publicUrl;
  }, [image, pickedImageAsset]);

  // CREATE
  const onCreate = useCallback(async () => {
    if (isSubmitting || isDeleting) return;
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      const imageUrl = await uploadImageIfNeeded();

      const payload = {
        name: name.trim(),
        price: priceValue!,
        image: imageUrl,
        description: description.trim() || null,
        in_stock: inStock,
      };

      await insertProduct(payload);

      resetForm();
      Alert.alert("Success", "Product created successfully.");
      router.back();
    } catch (err) {
      console.error("Create error:", err);
      Alert.alert("Error", "Failed to create product.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    insertProduct,
    isDeleting,
    isSubmitting,
    name,
    description,
    inStock,
    priceValue,
    router,
    uploadImageIfNeeded,
    validate,
  ]);

  // UPDATE
  const onUpdate = useCallback(async () => {
    if (!productId) return;
    if (isSubmitting || isDeleting) return;
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      const imageUrl = await uploadImageIfNeeded();

      const payload = {
        id: productId,
        name: name.trim(),
        price: priceValue!,
        image: imageUrl,
        description: description.trim() || null,
        in_stock: inStock,
      };

      await updateProduct(payload);

      resetForm();
      Alert.alert("Success", "Product updated successfully.");
      router.back();
    } catch (err) {
      console.error("Update error:", err);
      Alert.alert("Error", "Failed to update product.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    description,
    isDeleting,
    isSubmitting,
    name,
    inStock,
    priceValue,
    productId,
    router,
    uploadImageIfNeeded,
    updateProduct,
    validate,
  ]);

  // DELETE
  const onDelete = useCallback(async () => {
    if (!productId) return;
    if (isSubmitting || isDeleting) return;
    Alert.alert(
      "Archive Product",
      "This will remove the product from user menus while keeping past order history.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: async () => {
            try {
              setIsDeleting(true);
              // console.log("Deleting product with id:", productId);
              await deleteProduct(productId);
              resetForm();
              router.replace("/(admin)/menu");
              Alert.alert("Archived", "Product hidden from users.");
            } catch (err) {
              // console.error("Delete error:", err);
              Alert.alert("Error", "Failed to archive product.");
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  }, [deleteProduct, isDeleting, isSubmitting, productId, router]);

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
          source={{ uri: getSafeImageUrl(image ?? defaultPizzaImage) }}
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

        <Text style={styles.label}>Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Describe this product"
          style={[styles.input, styles.descriptionInput]}
          multiline
          textAlignVertical="top"
        />

        <Text style={styles.label}>Stock Status</Text>
        <View style={styles.stockRow}>
          <Pressable
            onPress={() => setInStock(true)}
            style={[styles.stockButton, inStock && styles.stockButtonActive]}
          >
            <Text style={[styles.stockText, inStock && styles.stockTextActive]}>
              In stock
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setInStock(false)}
            style={[styles.stockButton, !inStock && styles.stockButtonActive]}
          >
            <Text style={[styles.stockText, !inStock && styles.stockTextActive]}>
              Out of stock
            </Text>
          </Pressable>
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <Button
          onPress={handleButtonPress}
          text={buttonText}
          disabled={isSubmitting}
        />

        {isUpdating && (
          <Pressable onPress={onDelete} style={styles.deleteWrapper}>
            <Text style={styles.deleteText}>
              {isDeleting ? "Archiving..." : "Archive Product"}
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
  descriptionInput: {
    minHeight: 96,
  },
  stockRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  stockButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#FAFAFA",
  },
  stockButtonActive: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  stockText: {
    color: "#444",
    fontWeight: "600",
  },
  stockTextActive: {
    color: "#FFF",
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
