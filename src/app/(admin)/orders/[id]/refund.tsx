import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import Colors from "@/src/constants/Colors";
import { useColorScheme } from "@/src/components/useColorScheme";
import Button from "@/src/components/Button";
import { fetchPaymentTransaction, usePaymentGateway } from "@/src/api/payments";
import { useOrderDetails } from "@/src/api/orders";
import { useToast } from "@/src/providers/ToastProvider";
import { supabase } from "@/src/lib/supabase";
import { formatCurrencyZAR } from "@/src/lib/formatCurrency";

const REFUND_POLICY_SUMMARY = [
  "Delivery fees may already have been incurred and may not be refundable once dispatch-related work has started.",
  "Uncollected or late-cancelled orders may require cost recovery before any refund is approved.",
  "Custom work already started may justify retaining part of the original payment.",
].join(" ");

const RETENTION_PRESETS = [0, 10, 15, 25, 40] as const;

const clampPercentage = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
};

const parseDecimalToCents = (value: string) => {
  const normalized = value.replace(",", ".").trim();
  if (!normalized) return 0;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return NaN;
  return Math.round(parsed * 100);
};

const getNumericMetadataValue = (metadata: unknown, key: string) => {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return 0;
  }

  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
};

const getProfileDisplayLabel = (
  profile: Record<string, unknown> | null | undefined,
  fallback: string,
) => {
  const fullName =
    typeof profile?.full_name === "string" ? profile.full_name.trim() : "";
  if (fullName) return fullName;

  const firstName =
    typeof profile?.first_name === "string" ? profile.first_name.trim() : "";
  const surname =
    typeof profile?.surname === "string" ? profile.surname.trim() : "";
  const combined = `${firstName} ${surname}`.trim();
  if (combined) return combined;

  const email = typeof profile?.email === "string" ? profile.email.trim() : "";
  if (email) return email;

  return fallback;
};

export default function AdminRefundScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];

  const orderId = useMemo(() => {
    const parsed = Number(id);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [id]);

  const { data: order, isLoading: isOrderLoading, error: orderError } = useOrderDetails(
    orderId,
  );
  const transactionId = order?.payment_transaction_id ?? null;
  const {
    data: transaction,
    isLoading: isTransactionLoading,
    error: transactionError,
    refetch,
  } = useQuery({
    queryKey: ["payment-transaction", transactionId],
    enabled: Boolean(transactionId),
    queryFn: async () => fetchPaymentTransaction(transactionId ?? ""),
  });

  const { refundPayment } = usePaymentGateway();
  const [retainedPercentageInput, setRetainedPercentageInput] = useState("10");
  const [refundAmountInput, setRefundAmountInput] = useState("");
  const [reasonInput, setReasonInput] = useState("");

  const paidAmountCents = Number(transaction?.amount ?? 0);
  const alreadyRefundedCents = getNumericMetadataValue(
    transaction?.metadata ?? null,
    "refundedAmountTotal",
  );
  const gatewayRefundableCentsFromMetadata = getNumericMetadataValue(
    transaction?.metadata ?? null,
    "refundableAmount",
  );
  const gatewayRefundableCents =
    gatewayRefundableCentsFromMetadata > 0
      ? gatewayRefundableCentsFromMetadata
      : Math.max(0, paidAmountCents - alreadyRefundedCents);

  const retainedPercentage = clampPercentage(Number(retainedPercentageInput));
  const retainedAmountCents = Math.round((paidAmountCents * retainedPercentage) / 100);
  const policyMaximumRefundableCents = Math.max(0, paidAmountCents - retainedAmountCents);
  const policyRefundableRemainingCents = Math.max(
    0,
    policyMaximumRefundableCents - alreadyRefundedCents,
  );
  const maxRefundNowCents = Math.min(
    gatewayRefundableCents,
    policyRefundableRemainingCents,
  );
  const requestedRefundCents = parseDecimalToCents(refundAmountInput);
  const hasValidRequestedAmount =
    Number.isFinite(requestedRefundCents) &&
    requestedRefundCents > 0 &&
    requestedRefundCents <= maxRefundNowCents;
  const hasValidReason = reasonInput.trim().length >= 3;

  const refundHistory = useMemo(() => {
    const metadata = transaction?.metadata;
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      return [] as Array<Record<string, unknown>>;
    }

    const refunds = (metadata as Record<string, unknown>).refunds;
    if (!Array.isArray(refunds)) return [] as Array<Record<string, unknown>>;

    return refunds.filter(
      (entry): entry is Record<string, unknown> =>
        Boolean(entry) && typeof entry === "object" && !Array.isArray(entry),
    );
  }, [transaction?.metadata]);
  const refundRequesterIds = useMemo(
    () =>
      [...new Set(
        refundHistory
          .map((entry) =>
            typeof entry.requestedBy === "string" ? entry.requestedBy : null,
          )
          .filter((value): value is string => Boolean(value)),
      )],
    [refundHistory],
  );
  const { data: refundRequesterProfiles } = useQuery({
    queryKey: ["refund-requester-profiles", refundRequesterIds],
    enabled: refundRequesterIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, first_name, surname, email")
        .in("id", refundRequesterIds);

      if (error) {
        throw new Error(error.message);
      }

      return data ?? [];
    },
  });
  const refundRequesterMap = useMemo(
    () =>
      new Map(
        (refundRequesterProfiles ?? []).map((profile) => [profile.id, profile]),
      ),
    [refundRequesterProfiles],
  );

  const onSetMaximumRefund = () => {
    setRefundAmountInput((maxRefundNowCents / 100).toFixed(2));
  };

  const onSubmitRefund = async () => {
    if (!transactionId) {
      showToast("This order has no linked payment transaction.", "error");
      return;
    }

    if (!hasValidRequestedAmount) {
      showToast("Enter a valid refund amount within the allowed limit.", "error");
      return;
    }

    if (!hasValidReason) {
      showToast("Enter a short refund reason for the audit trail.", "error");
      return;
    }

    Alert.alert(
      "Confirm refund",
      `Refund ${formatCurrencyZAR(requestedRefundCents, { isCents: true })} while retaining ${retainedPercentage.toFixed(
        0,
      )}% (${formatCurrencyZAR(retainedAmountCents, { isCents: true })}) to cover incurred costs?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm refund",
          style: "destructive",
          onPress: async () => {
            try {
              await refundPayment.mutateAsync({
                transactionId,
                amount: requestedRefundCents,
                reason: reasonInput,
              });
              await refetch();
              showToast("Refund submitted successfully.", "success");
              router.back();
            } catch (error) {
              const message =
                error instanceof Error ? error.message : "Refund failed.";
              showToast(message, "error");
            }
          },
        },
      ],
    );
  };

  if (!orderId) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.textPrimary }}>Invalid order reference.</Text>
      </View>
    );
  }

  if (isOrderLoading || isTransactionLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.tint} />
      </View>
    );
  }

  if (orderError || !order) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.textPrimary }}>Order not found.</Text>
      </View>
    );
  }

  if (transactionError) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.textPrimary }}>
          Failed to load payment transaction.
        </Text>
      </View>
    );
  }

  if (!transactionId || !transaction) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.textPrimary }}>
          This order has no refundable payment transaction.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ title: `Refund Order #${order.id}` }} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
            Refund Calculation
          </Text>
          <Text style={[styles.helperText, { color: theme.textSecondary }]}>
            Set the retained-cost percentage first. The refund cannot exceed the
            remaining Yoco refundable balance or the policy-adjusted cap.
          </Text>

          <View style={styles.metricRow}>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
              Original payment
            </Text>
            <Text style={[styles.metricValue, { color: theme.textPrimary }]}>
              {formatCurrencyZAR(paidAmountCents, { isCents: true })}
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
              Already refunded
            </Text>
            <Text style={[styles.metricValue, { color: theme.textPrimary }]}>
              {formatCurrencyZAR(alreadyRefundedCents, { isCents: true })}
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
              Gateway refundable balance
            </Text>
            <Text style={[styles.metricValue, { color: theme.textPrimary }]}>
              {formatCurrencyZAR(gatewayRefundableCents, { isCents: true })}
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
            Policy Retention
          </Text>
          <Text style={[styles.policyText, { color: theme.textSecondary }]}>
            {REFUND_POLICY_SUMMARY}
          </Text>

          <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>
            Retained cost percentage
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.presetRow}
          >
            {RETENTION_PRESETS.map((preset) => {
              const isActive = retainedPercentage === preset;
              return (
                <Pressable
                  key={preset}
                  onPress={() => setRetainedPercentageInput(String(preset))}
                  style={[
                    styles.presetChip,
                    {
                      borderColor: theme.tint,
                      backgroundColor: isActive ? theme.tint : "transparent",
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: isActive ? theme.card : theme.tint,
                      fontWeight: "600",
                    }}
                  >
                    {preset}%
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <TextInput
            value={retainedPercentageInput}
            onChangeText={setRetainedPercentageInput}
            keyboardType="numeric"
            placeholder="10"
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.input,
              {
                borderColor: theme.border,
                color: theme.textPrimary,
                backgroundColor: theme.background,
              },
            ]}
          />

          <View style={styles.metricRow}>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
              Retained amount
            </Text>
            <Text style={[styles.metricValue, { color: theme.warning }]}>
              {formatCurrencyZAR(retainedAmountCents, { isCents: true })}
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
              Policy refundable remaining
            </Text>
            <Text style={[styles.metricValue, { color: theme.textPrimary }]}>
              {formatCurrencyZAR(policyRefundableRemainingCents, { isCents: true })}
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
              Maximum refund now
            </Text>
            <Text style={[styles.metricValue, { color: theme.success }]}>
              {formatCurrencyZAR(maxRefundNowCents, { isCents: true })}
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
            Refund Request
          </Text>
          <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>
            Refund amount
          </Text>
          <TextInput
            value={refundAmountInput}
            onChangeText={setRefundAmountInput}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.input,
              {
                borderColor: theme.border,
                color: theme.textPrimary,
                backgroundColor: theme.background,
              },
            ]}
          />

          <Pressable onPress={onSetMaximumRefund}>
            <Text style={[styles.maxRefundLink, { color: theme.tint }]}>
              Use maximum allowed refund
            </Text>
          </Pressable>

          <Text
            style={[
              styles.validationText,
              {
                color:
                  refundAmountInput.length === 0 || hasValidRequestedAmount
                    ? theme.textSecondary
                    : theme.error,
              },
            ]}
          >
            {refundAmountInput.length === 0
              ? "Enter the refund amount in rand."
              : hasValidRequestedAmount
                ? `Refund within limit: ${formatCurrencyZAR(requestedRefundCents, { isCents: true })}`
                : `Refund must be between ${formatCurrencyZAR(1, { isCents: true })} and ${formatCurrencyZAR(maxRefundNowCents, { isCents: true })}.`}
          </Text>

          <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>
            Refund reason
          </Text>
          <TextInput
            value={reasonInput}
            onChangeText={setReasonInput}
            placeholder="Example: retained delivery and production costs"
            placeholderTextColor={theme.textSecondary}
            multiline
            textAlignVertical="top"
            style={[
              styles.input,
              styles.reasonInput,
              {
                borderColor: theme.border,
                color: theme.textPrimary,
                backgroundColor: theme.background,
              },
            ]}
          />
          <Text
            style={[
              styles.validationText,
              { color: hasValidReason || reasonInput.length === 0 ? theme.textSecondary : theme.error },
            ]}
          >
            {hasValidReason
              ? "Reason will be stored with the refund record."
              : "Enter at least 3 characters for the refund reason."}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
            Refund History
          </Text>
          {refundHistory.length === 0 ? (
            <Text style={[styles.helperText, { color: theme.textSecondary }]}>
              No refunds have been recorded for this transaction yet.
            </Text>
          ) : (
            refundHistory
              .slice()
              .reverse()
              .map((entry, index) => {
                const amount =
                  typeof entry.amount === "number" && Number.isFinite(entry.amount)
                    ? entry.amount
                    : 0;
                const createdAt =
                  typeof entry.createdAt === "string" ? entry.createdAt : "Unknown date";
                const status =
                  typeof entry.status === "string" ? entry.status : "unknown";
                const reason =
                  typeof entry.reason === "string" ? entry.reason : "No reason recorded.";
                const requestedBy =
                  typeof entry.requestedBy === "string" ? entry.requestedBy : "unknown";
                const requestedByLabel = getProfileDisplayLabel(
                  refundRequesterMap.get(requestedBy),
                  requestedBy,
                );

                return (
                  <View
                    key={`${createdAt}-${index}`}
                    style={[styles.historyCard, { borderColor: theme.border }]}
                  >
                    <View style={styles.metricRow}>
                      <Text style={[styles.metricValue, { color: theme.textPrimary }]}>
                        {formatCurrencyZAR(amount, { isCents: true })}
                      </Text>
                      <Text style={[styles.historyStatus, { color: theme.tint }]}>
                        {status}
                      </Text>
                    </View>
                    <Text style={[styles.historyMeta, { color: theme.textSecondary }]}>
                      {createdAt}
                    </Text>
                    <Text style={[styles.historyMeta, { color: theme.textSecondary }]}>
                      Requested by: {requestedByLabel}
                    </Text>
                    <Text style={[styles.historyReason, { color: theme.textPrimary }]}>
                      {reason}
                    </Text>
                  </View>
                );
              })
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.background }]}>
        <Button
          text={refundPayment.isPending ? "Submitting refund..." : "Submit refund"}
          loading={refundPayment.isPending}
          disabled={!hasValidRequestedAmount || !hasValidReason || maxRefundNowCents <= 0}
          onPress={onSubmitRefund}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 140,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  helperText: {
    fontSize: 13,
    lineHeight: 20,
  },
  policyText: {
    fontSize: 13,
    lineHeight: 20,
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  metricLabel: {
    fontSize: 14,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: "700",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  reasonInput: {
    minHeight: 92,
  },
  presetRow: {
    gap: 8,
  },
  presetChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  maxRefundLink: {
    fontSize: 13,
    fontWeight: "600",
  },
  validationText: {
    fontSize: 13,
  },
  historyCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  historyMeta: {
    fontSize: 12,
  },
  historyStatus: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  historyReason: {
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
});
