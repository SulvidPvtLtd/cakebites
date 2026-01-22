import Button from "@/src/components/Button";
import { defaultPizzaImage } from "@/src/components/ProductListItem";
import Colors from "@/src/constants/Colors";
import * as ImagePicker from "expo-image-picker";
import { Stack } from "expo-router";
import React, { useCallback, useState } from "react";
import { Alert, Image, StyleSheet, Text, TextInput, View } from "react-native";

const MAX_NAME_LENGTH = 50;

const CreateProductScreen = () => {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [image, setImage] = useState<string | null>(null);
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
    }

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

  //Image picker funnction.
  const pickImage = async () => {
    // No permissions request is necessary for launching the image library.
    // Manually request permissions for videos on iOS when `allowsEditing` is set to `false`
    // and `videoExportPreset` is `'Passthrough'` (the default), ideally before launching the picker
    // so the app users aren't surprised by a system dialog after picking a video.
    // See "Invoke permissions for videos" sub section for more details.
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        "Permission required",
        "Permission to access the media library is required.",
      );
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    // console.log(result);

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Create Product" }} />

      <Image
        source={{ uri: image || defaultPizzaImage }}
        style={styles.image}
      />

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
