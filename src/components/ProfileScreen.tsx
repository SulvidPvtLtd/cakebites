import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/providers/AuthProvider";
import Colors from "@/src/constants/Colors";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Button from "./Button";

type ProfileScreenProps = {
  title?: string;
};

const PROFILE_IMAGE_BUCKET = "profile-images";

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

export default function ProfileScreen({ title }: ProfileScreenProps) {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const { session, profile } = useAuth();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [pickedImageAsset, setPickedImageAsset] = useState<PickedImageAsset | null>(
    null
  );
  const [isEditing, setIsEditing] = useState(false);
  const [profileExpanded, setProfileExpanded] = useState(false);
  const [saving, setSaving] = useState(false);

  const hydrateForm = () => {
    setEmail(profile?.email ?? session?.user?.email ?? "");
    setUsername(profile?.username ?? "");
    setMobileNumber(profile?.mobile_number ?? "");
    setFirstName(profile?.first_name ?? "");
    setSurname(profile?.surname ?? "");
    setDeliveryAddress(profile?.delivery_address ?? "");
    setAvatarUrl(profile?.avatar_url ?? "");
    setPickedImageAsset(null);
  };

  useEffect(() => {
    hydrateForm();
  }, [profile, session?.user?.email]);

  const inputStyle = {
    borderColor: theme.border,
    backgroundColor: theme.background,
    color: theme.textPrimary,
  };

  const labelStyle = { color: theme.textSecondary };
  const readOnlyStyle = {
    backgroundColor: theme.placeholder,
    color: theme.textSecondary,
  };

  const uploadAvatarIfNeeded = async () => {
    const trimmedUri = avatarUrl.trim();
    if (!trimmedUri) return null;
    if (!isLocalAssetUri(trimmedUri)) return trimmedUri;

    const asset: PickedImageAsset = pickedImageAsset ?? { uri: trimmedUri };
    const extension = getFileExt(asset);
    const contentType = asset.mimeType ?? `image/${extension}`;
    const filePath = `avatars/${session?.user.id}-${Date.now()}.${extension}`;

    const response = await fetch(asset.uri);
    if (!response.ok) {
      throw new Error("Failed to read selected image file.");
    }

    const arrayBuffer = await response.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(PROFILE_IMAGE_BUCKET)
      .upload(filePath, arrayBuffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage
      .from(PROFILE_IMAGE_BUCKET)
      .getPublicUrl(filePath);

    if (!data?.publicUrl) {
      throw new Error("Could not generate profile image URL.");
    }

    return data.publicUrl;
  };

  const pickProfileImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
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

    if (result.canceled) return;

    const asset = result.assets[0];
    setAvatarUrl(asset.uri);
    setPickedImageAsset({
      uri: asset.uri,
      mimeType: asset.mimeType ?? null,
      fileName: asset.fileName ?? null,
    });
  };

  const handleSave = async () => {
    if (!session) return;

    const nextEmail = email.trim();
    const nextUsername = username.trim();
    const nextMobile = mobileNumber.trim();
    const nextFirstName = firstName.trim();
    const nextSurname = surname.trim();
    const nextDeliveryAddress = deliveryAddress.trim();
    const currentEmail = (profile?.email ?? session.user.email ?? "").trim();

    try {
      setSaving(true);

      if (nextEmail && nextEmail !== currentEmail) {
        const { error: authError } = await supabase.auth.updateUser({
          email: nextEmail,
        });

        if (authError) {
          Alert.alert("Unable to update email", authError.message);
          return;
        }
      }

      const uploadedAvatarUrl = await uploadAvatarIfNeeded();

      const { error } = await supabase
        .from("profiles")
        .update({
          email: nextEmail || null,
          username: nextUsername || null,
          mobile_number: nextMobile || null,
          first_name: nextFirstName || null,
          surname: nextSurname || null,
          delivery_address: nextDeliveryAddress || null,
          avatar_url: uploadedAvatarUrl,
        })
        .eq("id", session.user.id);

      if (error) {
        Alert.alert("Unable to save profile", error.message);
        return;
      }

      setIsEditing(false);
      setProfileExpanded(false);
      setPickedImageAsset(null);

      Alert.alert(
        "Profile updated",
        nextEmail !== currentEmail
          ? "If your project requires email confirmation, check your inbox to confirm the new email."
          : "Your profile changes were saved."
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Please try again.";
      Alert.alert("Unable to save profile", message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogOut = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.auth.signOut();
          if (error) {
            await supabase.auth.signOut({ scope: "local" });
          }
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
    >
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => router.back()}
          style={[
            styles.headerIconButton,
            { borderColor: theme.border, backgroundColor: theme.card },
          ]}
        >
          <FontAwesome name="angle-left" size={20} color={theme.textPrimary} />
        </Pressable>

        <Text style={[styles.pageTitle, { color: theme.textPrimary }]}>Profile</Text>

        <Pressable
          onPress={() => Alert.alert("Notifications", "No new notifications.")}
          style={[
            styles.headerIconButton,
            { borderColor: theme.border, backgroundColor: theme.card },
          ]}
        >
          <FontAwesome name="bell-o" size={16} color={theme.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.avatarWrap}>
        <View style={styles.avatarContainer}>
          <Image
            source={
              avatarUrl
                ? { uri: avatarUrl }
                : require("@/assets/images/icon.png")
            }
            style={[styles.avatar, { borderColor: theme.border }]}
          />
          <Pressable
            onPress={pickProfileImage}
            style={[
              styles.avatarEditButton,
              { backgroundColor: theme.tint, borderColor: theme.background },
            ]}
          >
            <FontAwesome name="pencil" size={13} color={theme.card} />
          </Pressable>
        </View>
      </View>
      <View style={[styles.groupCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Pressable
          style={styles.optionRow}
          onPress={() => setProfileExpanded((prev) => !prev)}
        >
          <View style={styles.optionLeft}>
            <View style={[styles.iconBadge, { backgroundColor: theme.background }]}>
              <FontAwesome name="user-o" size={15} color={theme.textPrimary} />
            </View>
            <Text style={[styles.optionText, { color: theme.textPrimary }]}>Profile Details</Text>
          </View>
          <FontAwesome
            name={profileExpanded ? "angle-up" : "angle-down"}
            size={18}
            color={theme.textPrimary}
          />
        </Pressable>

        {profileExpanded && (
          <View style={[styles.profileFormWrap, { borderTopColor: theme.border }]}>
            <Text style={[styles.label, labelStyle]}>Email address</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              editable={isEditing}
              autoCapitalize="none"
              keyboardType="email-address"
              style={[styles.input, inputStyle, !isEditing && readOnlyStyle]}
            />

            <Text style={[styles.label, labelStyle]}>Username</Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              editable={isEditing}
              autoCapitalize="none"
              style={[styles.input, inputStyle, !isEditing && readOnlyStyle]}
            />

            <Text style={[styles.label, labelStyle]}>Mobile number</Text>
            <TextInput
              value={mobileNumber}
              onChangeText={setMobileNumber}
              editable={isEditing}
              keyboardType="phone-pad"
              style={[styles.input, inputStyle, !isEditing && readOnlyStyle]}
            />

            <Text style={[styles.label, labelStyle]}>First name</Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              editable={isEditing}
              style={[styles.input, inputStyle, !isEditing && readOnlyStyle]}
            />

            <Text style={[styles.label, labelStyle]}>Surname</Text>
            <TextInput
              value={surname}
              onChangeText={setSurname}
              editable={isEditing}
              style={[styles.input, inputStyle, !isEditing && readOnlyStyle]}
            />

            <Text style={[styles.label, labelStyle]}>Delivery address</Text>
            <TextInput
              value={deliveryAddress}
              onChangeText={setDeliveryAddress}
              editable={isEditing}
              multiline
              style={[
                styles.input,
                inputStyle,
                styles.addressInput,
                !isEditing && readOnlyStyle,
              ]}
            />

            {isEditing ? (
              <>
                <Button
                  text={saving ? "Saving..." : "Save Changes"}
                  onPress={handleSave}
                  loading={saving}
                />
                <Button
                  text="Cancel"
                  onPress={() => {
                    hydrateForm();
                    setIsEditing(false);
                  }}
                />
              </>
            ) : (
              <Button text="Edit Profile" onPress={() => setIsEditing(true)} />
            )}
          </View>
        )}

        <Pressable
          style={styles.optionRow}
          onPress={() => Alert.alert("Order History", "Coming soon.")}
        >
          <View style={styles.optionLeft}>
            <View style={[styles.iconBadge, { backgroundColor: theme.background }]}>
              <FontAwesome name="list-alt" size={15} color={theme.textPrimary} />
            </View>
            <Text style={[styles.optionText, { color: theme.textPrimary }]}>Order History</Text>
          </View>
          <FontAwesome name="angle-down" size={18} color={theme.textPrimary} />
        </Pressable>

        <Pressable
          style={styles.optionRow}
          onPress={() => Alert.alert("Saved Wishlist", "Coming soon.")}
        >
          <View style={styles.optionLeft}>
            <View style={[styles.iconBadge, { backgroundColor: theme.background }]}>
              <FontAwesome name="heart-o" size={15} color={theme.textPrimary} />
            </View>
            <Text style={[styles.optionText, { color: theme.textPrimary }]}>Saved Wishlist</Text>
          </View>
          <FontAwesome name="angle-down" size={18} color={theme.textPrimary} />
        </Pressable>
      </View>

      <View style={[styles.groupCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Pressable
          style={styles.optionRow}
          onPress={() => Alert.alert("Payment Methods", "Coming soon.")}
        >
          <View style={styles.optionLeft}>
            <View style={[styles.iconBadge, { backgroundColor: theme.background }]}>
              <FontAwesome name="credit-card" size={15} color={theme.textPrimary} />
            </View>
            <Text style={[styles.optionText, { color: theme.textPrimary }]}>Payment Methods</Text>
          </View>
          <FontAwesome name="angle-down" size={18} color={theme.textPrimary} />
        </Pressable>

        <Pressable
          style={styles.optionRow}
          onPress={() => Alert.alert("Help & Support", "Coming soon.")}
        >
          <View style={styles.optionLeft}>
            <View style={[styles.iconBadge, { backgroundColor: theme.background }]}>
              <FontAwesome name="question-circle-o" size={15} color={theme.textPrimary} />
            </View>
            <Text style={[styles.optionText, { color: theme.textPrimary }]}>Help & Support</Text>
          </View>
          <FontAwesome name="angle-down" size={18} color={theme.textPrimary} />
        </Pressable>
      </View>

      <View style={[styles.groupCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Pressable style={styles.optionRow} onPress={handleLogOut}>
          <View style={styles.optionLeft}>
            <View
              style={[
                styles.iconBadge,
                styles.logoutBadge,
                { backgroundColor: theme.placeholder },
              ]}
            >
              <FontAwesome name="sign-out" size={15} color={theme.error} />
            </View>
            <Text style={[styles.logoutText, { color: theme.error }]}>Logout Option</Text>
          </View>
          <FontAwesome name="angle-down" size={18} color={theme.textPrimary} />
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 28,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: "700",
  },
  avatarWrap: {
    alignItems: "center",
    marginTop: 18,
    marginBottom: 22,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 0,
  },
  avatarEditButton: {
    position: "absolute",
    right: 0,
    bottom: 2,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  groupCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 4,
    marginBottom: 14,
  },
  optionRow: {
    minHeight: 60,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: {
    fontSize: 17,
    fontWeight: "500",
  },
  profileFormWrap: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderTopWidth: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 10,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  addressInput: {
    minHeight: 84,
    textAlignVertical: "top",
  },
  logoutBadge: {
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
