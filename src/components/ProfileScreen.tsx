import { supabase } from "@/src/lib/supabase";
import { validateDeliveryAddress } from "@/src/api/delivery";
import { useMyOrders } from "@/src/api/orders";
import { useWishlist, useWishlistActions } from "@/src/api/wishlist";
import { useAuth } from "@/src/providers/AuthProvider";
import Colors from "@/src/constants/Colors";
import { formatCurrencyZAR } from "@/src/lib/formatCurrency";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { router, useLocalSearchParams } from "expo-router";
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
  const { session, profile, signOut, refreshProfile } = useAuth();
  const isAdminProfile = (profile?.group ?? "").trim().toLowerCase() === "admin";
  const { source, returnTo } = useLocalSearchParams<{
    source?: string | string[];
    returnTo?: string | string[];
  }>();
  const normalizeParam = (value?: string | string[]) =>
    Array.isArray(value) ? value[0] : value;
  const cameFromCheckout = normalizeParam(source) === "checkout";
  const returnPath = normalizeParam(returnTo) || "/cart";

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
  const [orderHistoryExpanded, setOrderHistoryExpanded] = useState(false);
  const [wishlistExpanded, setWishlistExpanded] = useState(false);
  const [paymentMethodsExpanded, setPaymentMethodsExpanded] = useState(false);
  const [supportExpanded, setSupportExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const { data: myOrders } = useMyOrders();
  const { data: wishlistItems, isLoading: isWishlistLoading } = useWishlist();
  const { removeFromWishlist } = useWishlistActions();
  const recentOrders = (myOrders ?? []).slice(0, 5);
  const savedWishlistItems = wishlistItems?.filter((item) => item.products) ?? [];

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
    const currentDeliveryAddress = (profile?.delivery_address ?? "").trim();

    try {
      setSaving(true);

      if (nextDeliveryAddress && nextDeliveryAddress !== currentDeliveryAddress) {
        try {
          await validateDeliveryAddress(nextDeliveryAddress);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Please try again.";
          Alert.alert("Invalid delivery address", message);
          return;
        }
      }

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

      await refreshProfile();
      setIsEditing(false);
      setProfileExpanded(false);
      setPickedImageAsset(null);

      const successMessage =
        nextEmail !== currentEmail
          ? "If your project requires email confirmation, check your inbox to confirm the new email."
          : "Your profile changes were saved.";

      if (cameFromCheckout && nextDeliveryAddress) {
        Alert.alert("Profile updated", successMessage, [
          { text: "Back to cart", onPress: () => router.replace(returnPath) },
          { text: "Stay here", style: "cancel" },
        ]);
      } else {
        Alert.alert("Profile updated", successMessage);
      }
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
          // Use local scope so logout is immediate even on slow/offline networks.
          await signOut();
        },
      },
    ]);
  };

  const handleRemoveWishlistItem = async (productId: number) => {
    try {
      await removeFromWishlist.mutateAsync(productId);
    } catch (error) {
      Alert.alert(
        "Wishlist unavailable",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.headerWrap, { backgroundColor: theme.background }]}>
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

          <Text style={[styles.pageTitle, { color: theme.textPrimary }]}>
            {title ?? "Profile"}
          </Text>

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
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
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
          <View
            style={[
              styles.profileFormWrap,
              styles.sectionBorderTop,
              { borderTopColor: theme.border },
            ]}
          >
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
      </View>

        {isAdminProfile && (
          <View style={[styles.groupCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Pressable
              style={styles.optionRow}
              onPress={() => router.push("/(admin)/delivery-settings")}
            >
              <View style={styles.optionLeft}>
                <View style={[styles.iconBadge, { backgroundColor: theme.background }]}>
                  <FontAwesome name="truck" size={15} color={theme.textPrimary} />
                </View>
                <Text style={[styles.optionText, { color: theme.textPrimary }]}>
                  Delivery Settings
                </Text>
              </View>
              <FontAwesome name="angle-right" size={18} color={theme.textPrimary} />
            </Pressable>
            <View
              style={[
                styles.sectionBody,
                styles.sectionBorderTop,
                { borderTopColor: theme.border },
              ]}
            >
              <Text style={[styles.sectionHelper, { color: theme.textSecondary }]}>
                Update the collection address and per-km delivery rate used for delivery quotes.
              </Text>
              <Button
                text="Open Delivery Settings"
                onPress={() => router.push("/(admin)/delivery-settings")}
              />
            </View>
          </View>
        )}

      <View style={[styles.groupCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Pressable
          style={styles.optionRow}
          onPress={() => setOrderHistoryExpanded((prev) => !prev)}
        >
          <View style={styles.optionLeft}>
            <View style={[styles.iconBadge, { backgroundColor: theme.background }]}>
              <FontAwesome name="list-alt" size={15} color={theme.textPrimary} />
            </View>
            <Text style={[styles.optionText, { color: theme.textPrimary }]}>Order History</Text>
          </View>
          <FontAwesome
            name={orderHistoryExpanded ? "angle-up" : "angle-down"}
            size={18}
            color={theme.textPrimary}
          />
        </Pressable>
        {orderHistoryExpanded && (
          <View
            style={[
              styles.sectionBody,
              styles.sectionBorderTop,
              { borderTopColor: theme.border },
            ]}
          >
            {recentOrders.length === 0 ? (
              <Text style={[styles.sectionHelper, { color: theme.textSecondary }]}>
                No orders yet. Your completed and in-progress orders will appear here.
              </Text>
            ) : (
              recentOrders.map((order) => (
                <Pressable
                  key={order.id}
                  onPress={() =>
                    router.push(
                      `${
                        isAdminProfile ? "/(admin)" : "/(user)"
                      }/orders/${order.id}` as never,
                    )
                  }
                  style={[styles.inlineCard, { borderColor: theme.border, backgroundColor: theme.background }]}
                >
                  <Text style={[styles.inlineCardTitle, { color: theme.textPrimary }]}>
                    Order #{order.id}
                  </Text>
                  <Text style={[styles.inlineCardMeta, { color: theme.textSecondary }]}>
                    Status: {order.status}
                  </Text>
                  <Text style={[styles.inlineCardMeta, { color: theme.textSecondary }]}>
                    Total: {formatCurrencyZAR(Number(order.total ?? 0))}
                  </Text>
                </Pressable>
              ))
            )}
            <Button
              text="Open Full Order List"
              onPress={() =>
                router.push(
                  isAdminProfile
                    ? "/(admin)/orders/list?source=profile"
                    : "/(user)/orders?source=profile",
                )
              }
            />
          </View>
        )}

        <Pressable
          style={styles.optionRow}
          onPress={() => setWishlistExpanded((prev) => !prev)}
        >
          <View style={styles.optionLeft}>
            <View style={[styles.iconBadge, { backgroundColor: theme.background }]}>
              <FontAwesome name="heart-o" size={15} color={theme.textPrimary} />
            </View>
            <Text style={[styles.optionText, { color: theme.textPrimary }]}>Saved Wishlist</Text>
          </View>
          <FontAwesome
            name={wishlistExpanded ? "angle-up" : "angle-down"}
            size={18}
            color={theme.textPrimary}
          />
        </Pressable>
        {wishlistExpanded && (
          <View
            style={[
              styles.sectionBody,
              styles.sectionBorderTop,
              { borderTopColor: theme.border },
            ]}
          >
            {isWishlistLoading ? (
              <Text style={[styles.sectionHelper, { color: theme.textSecondary }]}>
                Loading your saved wishlist...
              </Text>
            ) : savedWishlistItems.length === 0 ? (
              <Text style={[styles.sectionHelper, { color: theme.textSecondary }]}>
                You have no saved wishlist items yet. Browse the menu and tap the heart to save products here.
              </Text>
            ) : (
              savedWishlistItems.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.inlineCard,
                    { borderColor: theme.border, backgroundColor: theme.background },
                  ]}
                >
                  <Pressable
                    onPress={() =>
                      router.push(
                        `${isAdminProfile ? "/(admin)" : "/(user)"}/menu/${item.product_id}` as never,
                      )
                    }
                    style={styles.wishlistRow}
                  >
                    <View style={styles.wishlistTextBlock}>
                      <Text style={[styles.inlineCardTitle, { color: theme.textPrimary }]}>
                        {item.products?.name ?? `Product #${item.product_id}`}
                      </Text>
                      <Text style={[styles.inlineCardMeta, { color: theme.textSecondary }]}>
                        Added {new Date(item.created_at).toLocaleDateString()}
                      </Text>
                        <Text style={[styles.inlineCardMeta, { color: theme.textSecondary }]}>
                          Price: {formatCurrencyZAR(Number(item.products?.price ?? 0))}
                        </Text>
                    </View>
                    <FontAwesome name="angle-right" size={18} color={theme.textSecondary} />
                  </Pressable>
                  <View style={styles.wishlistActionRow}>
                    <Pressable
                      onPress={() => handleRemoveWishlistItem(item.product_id)}
                      disabled={removeFromWishlist.isPending}
                      style={[
                        styles.wishlistRemoveButton,
                        {
                          backgroundColor: theme.placeholder,
                          borderColor: theme.border,
                          opacity: removeFromWishlist.isPending ? 0.6 : 1,
                        },
                      ]}
                    >
                      <Text style={[styles.wishlistRemoveText, { color: theme.error }]}>
                        {removeFromWishlist.isPending ? "Removing..." : "Remove"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
            <Button
              text="Browse Menu"
              onPress={() => router.push(isAdminProfile ? "/(admin)/menu" : "/(user)/menu")}
            />
          </View>
        )}
      </View>

      <View style={[styles.groupCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Pressable
          style={styles.optionRow}
          onPress={() => setPaymentMethodsExpanded((prev) => !prev)}
        >
          <View style={styles.optionLeft}>
            <View style={[styles.iconBadge, { backgroundColor: theme.background }]}>
              <FontAwesome name="credit-card" size={15} color={theme.textPrimary} />
            </View>
            <Text style={[styles.optionText, { color: theme.textPrimary }]}>Payment Methods</Text>
          </View>
          <FontAwesome
            name={paymentMethodsExpanded ? "angle-up" : "angle-down"}
            size={18}
            color={theme.textPrimary}
          />
        </Pressable>
        {paymentMethodsExpanded && (
          <View
            style={[
              styles.sectionBody,
              styles.sectionBorderTop,
              { borderTopColor: theme.border },
            ]}
          >
            <View style={[styles.inlineCard, { borderColor: theme.border, backgroundColor: theme.background }]}>
              <Text style={[styles.inlineCardTitle, { color: theme.textPrimary }]}>Yoco</Text>
              <Text style={[styles.inlineCardMeta, { color: theme.textSecondary }]}>
                Card and EFT checkout are currently supported through Yoco.
              </Text>
            </View>
            <View style={[styles.inlineCard, { borderColor: theme.border, backgroundColor: theme.background }]}>
              <Text style={[styles.inlineCardTitle, { color: theme.textPrimary }]}>Security Note</Text>
              <Text style={[styles.inlineCardMeta, { color: theme.textSecondary }]}>
                Payment methods are handled on the secure gateway and are not stored directly in this app.
              </Text>
            </View>
          </View>
        )}

        <Pressable
          style={styles.optionRow}
          onPress={() => setSupportExpanded((prev) => !prev)}
        >
          <View style={styles.optionLeft}>
            <View style={[styles.iconBadge, { backgroundColor: theme.background }]}>
              <FontAwesome name="question-circle-o" size={15} color={theme.textPrimary} />
            </View>
            <Text style={[styles.optionText, { color: theme.textPrimary }]}>Help & Support</Text>
          </View>
          <FontAwesome
            name={supportExpanded ? "angle-up" : "angle-down"}
            size={18}
            color={theme.textPrimary}
          />
        </Pressable>
        {supportExpanded && (
          <View
            style={[
              styles.sectionBody,
              styles.sectionBorderTop,
              { borderTopColor: theme.border },
            ]}
          >
            <Text style={[styles.sectionHelper, { color: theme.textSecondary }]}>
              Need help with delivery terms, payment, or order progress? Review the delivery terms or go straight to your order list for the latest status.
            </Text>
            <Button text="View Delivery Terms" onPress={() => router.push("/delivery-terms")} />
            <Button
              text="Open My Orders"
              onPress={() => router.push(isAdminProfile ? "/(admin)/orders/list" : "/(user)/orders")}
            />
          </View>
        )}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 28,
    paddingTop: 6,
  },
  headerWrap: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 6,
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
  },
  sectionBorderTop: {
    borderTopWidth: 1,
  },
  sectionBody: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 8,
    gap: 10,
  },
  sectionHelper: {
    fontSize: 13,
    lineHeight: 20,
  },
  inlineCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  inlineCardTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  inlineCardMeta: {
    fontSize: 13,
    lineHeight: 18,
  },
  wishlistRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  wishlistTextBlock: {
    flex: 1,
    gap: 4,
  },
  wishlistActionRow: {
    alignItems: "flex-end",
    marginTop: 6,
  },
  wishlistRemoveButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  wishlistRemoveText: {
    fontSize: 12,
    fontWeight: "600",
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
