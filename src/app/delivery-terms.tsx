import { useProduct } from "@/src/api/products";
import Button from "@/src/components/Button";
import Colors from "@/src/constants/Colors";
import { getProductSizePriceMap } from "@/src/lib/sizePricing";
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
const IMPORTANT_CLAUSES = [
  {
    title: "Cake Care",
    note: "Reducing Damage Disputes",
    detail:
      "After delivery or collection, customers are responsible for correct storage, handling, and transport conditions.",
  },
  {
    title: "Design Disclaimer",
    note: 'Reducing "it doesn\'t look the same" complaints',
    detail:
      "Custom cakes may have reasonable variations due to artistic interpretation, material availability, and color differences.",
  },
  {
    title: "Cancellation Policy",
    note: "Protecting Revenue",
    detail:
      "Late cancellations and orders already in preparation may only qualify for partial refunds based on costs incurred.",
  },
] as const;

const DELIVERY_TERMS = `Bakery Fulfilment Terms & Conditions (South Africa)

1. Orders & Deposits

1.1 All customised cake orders require a minimum 50% deposit before production begins.
1.2 An order is only confirmed once the deposit has been received and acknowledged.
1.3 The remaining balance must be paid before delivery or collection, unless otherwise agreed.

2. Cancellations & Refunds

2.1 Orders may be cancelled within 1 hour of placement, provided that preparation has not commenced.
2.2 If cancellation occurs after 1 hour or once baking/preparation has begun, any refund will be:
Partial, and
Based on costs already incurred, including:
Ingredients and materials used
Labour and preparation time
Administrative costs
2.3 Refunds (if applicable) will be processed within 5-10 business days.
2.4 Cancellation fees will always be fair and reasonable in line with the Consumer Protection Act.

3. Order Changes

3.1 Changes must be requested as early as possible.
3.2 We reserve the right to decline changes once production has started or where changes are not feasible.

4. Delivery Policy

4.1 Delivery is available only within designated serviceable areas.
4.2 We reserve the right to decline delivery to high-risk or restricted areas ("red zones").
4.3 Delivery times are estimates and may be affected by traffic, weather, or unforeseen delays.
4.4 Customers must provide accurate delivery details and ensure availability to receive the order.
4.5 Failed deliveries due to incorrect information or unavailability may result in additional charges.

5. Collection Policy

5.1 Orders must be collected at the agreed date and time.
5.2 Once the order has been handed over, responsibility transfers fully to the customer.

6. Risk & Liability

6.1 Upon delivery or collection, the bakery is no longer responsible for any damage, loss, or deterioration.
6.2 This includes issues arising from:
Improper storage
Transport conditions
Environmental exposure (e.g., heat)
6.3 No refunds or replacements will be issued once the product has been accepted in good condition.

7. Right to Refuse Service

7.1 The company reserves the right to decline or cancel any order at its discretion.
7.2 Refunds will be issued fairly depending on whether production has commenced, in line with the Consumer Protection Act.

8. Quality & Complaints

8.1 Issues must be reported within 24 hours of delivery or collection.
8.2 Complaints must include proof of purchase and supporting evidence (e.g., photos).
8.3 All complaints will be assessed fairly.

9. Personal Information & Privacy

9.1 We collect personal information (name, address, phone number, email) for order fulfilment and communication.
9.2 Information may also be used for internal sales analysis.
9.3 All data is handled in accordance with the Protection of Personal Information Act.
9.4 We do not sell or unlawfully share customer information.

10. Cake Care Instructions (Important)

10.1 Cakes are perishable products and require proper handling.
10.2 Customers are responsible for:
Keeping the cake refrigerated where required
Storing the cake away from direct sunlight and heat
Transporting the cake on a flat, stable surface
10.3 Tall or tiered cakes are especially sensitive and must be handled with extra care.
10.4 The bakery will not be liable for any damage caused after collection or delivery due to improper handling or storage.

11. Design Disclaimer (Custom Cakes)

11.1 While we strive to match requested designs, exact replication is not guaranteed.
11.2 Variations may occur due to:
Artistic interpretation
Availability of materials
Colour differences (especially between digital images and real products)
11.3 By placing an order, the customer acknowledges and accepts reasonable variations in the final product.

12. Force Majeure

12.1 The bakery shall not be held liable for failure or delay in fulfilling orders due to circumstances beyond its control, including but not limited to:
Power outages / load shedding
Natural disasters
Strikes or civil unrest
Supplier failures
Government restrictions
12.2 In such cases:
Customers will be informed as soon as reasonably possible
Alternative arrangements or refunds will be discussed where applicable

13. General

13.1 By placing an order, the customer agrees to these Terms & Conditions.
13.2 These terms may be updated without prior notice.`;

type TermsParams = {
  productId?: string;
  size?: string;
  unitPrice?: string;
};

export default function DeliveryTermsScreen() {
  const {
    productId: productIdParam,
    size: sizeParam,
    unitPrice: unitPriceParam,
  } = useLocalSearchParams<TermsParams>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const deliveryTermLines = useMemo(() => DELIVERY_TERMS.split("\n"), []);

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
  const unitPrice = useMemo(() => {
    const parsed = Number(unitPriceParam);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    if (!product || !size) return null;
    const sizePriceMap = getProductSizePriceMap(product);
    return sizePriceMap[size];
  }, [product, size, unitPriceParam]);

  const onAcceptTerms = async () => {
    if (!confirmed) {
      Alert.alert(
        "Confirm terms",
        "Please confirm that you have read and accepted the delivery terms.",
      );
      return;
    }

    if (!product || !size || unitPrice === null) {
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
      addItem(product, size, unitPrice);
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
        <View
          style={[
            styles.importantSection,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.importantTitle, { color: theme.textPrimary }]}>
            Important Clauses
          </Text>
          {IMPORTANT_CLAUSES.map((clause) => (
            <View key={clause.title} style={styles.clauseItem}>
              <Text style={[styles.clauseTitle, { color: theme.textPrimary }]}>
                {clause.title}
              </Text>
              <Text style={[styles.clauseNote, { color: theme.tint }]}>
                {clause.note}
              </Text>
              <Text
                style={[styles.clauseDetail, { color: theme.textSecondary }]}
              >
                {clause.detail}
              </Text>
            </View>
          ))}
        </View>
        <View>
          {deliveryTermLines.map((line, index) => {
            const isSectionHeading = /^\d+\.\s/.test(line.trim());
            if (!line.trim()) {
              return <View key={`spacer-${index}`} style={styles.bodySpacer} />;
            }

            return (
              <Text
                key={`term-line-${index}`}
                style={[
                  styles.body,
                  isSectionHeading && styles.bodyHeading,
                  { color: isSectionHeading ? theme.tint : theme.textSecondary },
                ]}
              >
                {line}
              </Text>
            );
          })}
        </View>

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

      <View style={[styles.footer, { backgroundColor: theme.card }]}>
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
  bodyHeading: {
    fontWeight: "700",
  },
  bodySpacer: {
    height: 10,
  },
  importantSection: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  importantTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  clauseItem: {
    gap: 4,
  },
  clauseTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  clauseNote: {
    fontSize: 13,
    fontWeight: "700",
  },
  clauseDetail: {
    fontSize: 13,
    lineHeight: 19,
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
  },
});
