import { useProduct } from "@/src/api/products";
import Button from "@/src/components/Button";
import Colors from "@/src/constants/Colors";
import { useCart } from "@/src/providers/CartProvider";
import { ProductSize } from "@/src/types";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";

const VALID_SIZES: readonly ProductSize[] = ["S", "M", "L", "XL"];

const DELIVERY_TERMS = `Cake Delivery Terms & Conditions
1. Order Processing
All cake orders must be confirmed and paid in full before preparation begins.
Changes to orders must be made at least 48 hours before the scheduled delivery/collection date.
Same-day or urgent orders are subject to availability and may incur additional fees.

2. Delivery Availability
Delivery is available within designated service areas only.
Delivery times are provided as time windows, not exact arrival times.
We reserve the right to decline delivery outside our delivery zones.

3. Delivery Fees
Delivery fees are calculated based on distance and location.
Fees are non-refundable once the order has been dispatched.

4. Delivery Responsibility
Customers must ensure that the correct delivery address is provided, recipient is available, and contact details are accurate.
Failed deliveries due to customer fault may incur redelivery fees.

5. Cake Condition & Handling
Cakes are inspected before dispatch.
Responsibility transfers to the customer upon successful delivery.

6. Weather & External Factors
Extreme weather, traffic, power outages, or force majeure events may cause delays.

7. Self-Collection Terms
Orders must be collected at the agreed date and time.
Uncollected orders after 24 hours may be disposed of without refund.

8. Cancellations & Refunds
Cancellations must be made at least 72 hours before delivery/collection.
Custom-designed cakes are non-refundable once production has started.

9. Quality Assurance
Damage must be reported immediately with photo evidence upon receipt.

10. Hygiene & Food Safety
All products are prepared in compliance with food safety standards.
Allergen information must be requested before ordering.`;

type TermsParams = {
  productId?: string;
  size?: string;
};

export default function DeliveryTermsScreen() {
  const { productId: productIdParam, size: sizeParam } =
    useLocalSearchParams<TermsParams>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);

  const { addItem, acceptDeliveryTerms, setFulfillmentOption } = useCart();

  const productId = useMemo(() => {
    const parsed = Number(productIdParam);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [productIdParam]);

  const size = useMemo(() => {
    if (!sizeParam || typeof sizeParam !== "string") return null;
    return VALID_SIZES.includes(sizeParam as ProductSize)
      ? (sizeParam as ProductSize)
      : null;
  }, [sizeParam]);

  const { data: product } = useProduct(productId ?? -1);

  const onAcceptTerms = async () => {
    if (!confirmed) {
      Alert.alert(
        "Confirm terms",
        "Please confirm that you have read and accepted the delivery terms.",
      );
      return;
    }

    if (!product || !size) {
      Alert.alert(
        "Unable to continue",
        "Product details were not found. Please go back and try again.",
      );
      return;
    }

    try {
      setSaving(true);
      acceptDeliveryTerms();
      setFulfillmentOption("DELIVERY");
      addItem(product, size);
      router.replace("/cart");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ title: "Delivery Terms" }} />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>
          Read Before Choosing Delivery
        </Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          {DELIVERY_TERMS}
        </Text>

        <Pressable
          onPress={() => setConfirmed((prev) => !prev)}
          style={styles.confirmRow}
        >
          <View
            style={[
              styles.checkbox,
              {
                borderColor: theme.tint,
                backgroundColor: confirmed ? theme.tint : "transparent",
              },
            ]}
          />
          <Text style={[styles.confirmText, { color: theme.textPrimary }]}>
            I have read and accept the delivery terms and conditions.
          </Text>
        </Pressable>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          onPress={onAcceptTerms}
          text={saving ? "Saving..." : "Accept and Continue"}
          disabled={saving}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 140,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
  },
  confirmRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  confirmText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    backgroundColor: "#FFFFFF",
  },
});
