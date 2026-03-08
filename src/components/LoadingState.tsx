import Colors from "@constants/Colors";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, useColorScheme, View } from "react-native";

type LoadingStateProps = {
  title?: string;
  message?: string;
  compact?: boolean;
};

export default function LoadingState({
  title = "Loading",
  message = "Fetching the latest products...",
  compact = false,
}: LoadingStateProps) {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(0);

    const timer = setInterval(() => {
      setProgress((current) => {
        const cap = compact ? 97 : 94;
        if (current >= cap) {
          return current;
        }

        if (current < 45) {
          return Math.min(cap, current + 7);
        }

        if (current < 78) {
          return Math.min(cap, current + 4);
        }

        return Math.min(cap, current + 1);
      });
    }, 90);

    return () => clearInterval(timer);
  }, [compact]);

  return (
    <View
      style={[
        styles.container,
        compact ? styles.compactContainer : styles.fullContainer,
        { backgroundColor: compact ? "transparent" : theme.background },
      ]}
    >
      <View
        style={[
          compact ? styles.compactBadge : styles.badge,
          { borderColor: theme.border, backgroundColor: theme.card },
        ]}
      >
        <View
          style={[
            compact ? styles.compactRing : styles.ring,
            { borderColor: theme.border, borderTopColor: theme.tint },
          ]}
        >
          <Text style={[compact ? styles.compactPercent : styles.percent, { color: theme.textPrimary }]}>
            {progress}%
          </Text>
        </View>
      </View>

      {!compact && (
        <>
          <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
          <Text style={[styles.message, { color: theme.textSecondary }]}>{message}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  fullContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  compactContainer: {
    width: "100%",
    height: "100%",
  },
  badge: {
    alignItems: "center",
    justifyContent: "center",
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 1,
  },
  compactBadge: {
    alignItems: "center",
    justifyContent: "center",
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1,
  },
  ring: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 8,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-35deg" }],
  },
  compactRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 6,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-35deg" }],
  },
  percent: {
    fontSize: 28,
    fontWeight: "800",
    transform: [{ rotate: "35deg" }],
  },
  compactPercent: {
    fontSize: 18,
    fontWeight: "800",
    transform: [{ rotate: "35deg" }],
  },
  title: {
    marginTop: 18,
    fontSize: 20,
    fontWeight: "700",
  },
  message: {
    marginTop: 8,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 240,
  },
});
