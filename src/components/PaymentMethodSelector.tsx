import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Colors from "@constants/Colors";
import { useColorScheme } from "@components/useColorScheme";
import type { PaymentGateway } from "@/src/types";

type GatewayOption = {
  id: PaymentGateway;
  label: string;
  description: string;
  enabled: boolean;
};

const GATEWAYS: GatewayOption[] = [
  {
    id: "yoco",
    label: "Yoco",
    description: "Card or EFT via hosted checkout.",
    enabled: true,
  },
  {
    id: "payfast",
    label: "Payfast",
    description: "Coming soon.",
    enabled: false,
  },
  {
    id: "ozow",
    label: "Ozow",
    description: "Coming soon.",
    enabled: false,
  },
];

type PaymentMethodSelectorProps = {
  selectedGateway: PaymentGateway | null;
  onSelect: (gateway: PaymentGateway) => void;
};

export default function PaymentMethodSelector({
  selectedGateway,
  onSelect,
}: PaymentMethodSelectorProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  return (
    <View style={styles.container}>
      {GATEWAYS.map((gateway) => {
        const isSelected = selectedGateway === gateway.id;
        const isDisabled = !gateway.enabled;

        return (
          <Pressable
            key={gateway.id}
            onPress={() => gateway.enabled && onSelect(gateway.id)}
            style={[
              styles.card,
              {
                borderColor: isSelected ? theme.tint : theme.border,
                backgroundColor: isSelected ? theme.tint : theme.card,
                opacity: isDisabled ? 0.5 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.title,
                { color: isSelected ? theme.card : theme.textPrimary },
              ]}
            >
              {gateway.label}
            </Text>
            <Text
              style={[
                styles.subtitle,
                { color: isSelected ? theme.card : theme.textSecondary },
              ]}
            >
              {gateway.description}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
  },
});
