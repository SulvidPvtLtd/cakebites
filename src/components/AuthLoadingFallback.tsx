import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";

import Colors from "@constants/Colors";
import Button from "@/src/components/Button";

type AuthLoadingFallbackProps = {
  timedOut: boolean;
  onRetry: () => void;
};

export default function AuthLoadingFallback({
  timedOut,
  onRetry,
}: AuthLoadingFallbackProps) {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];

  return (
    <View style={styles.container}>
      <ActivityIndicator />
      {timedOut ? (
        <>
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            Still loading...
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            This is taking longer than expected. Check your connection and try
            again.
          </Text>
          <View style={styles.buttonWrap}>
            <Button text="Try again" onPress={onRetry} />
          </View>
        </>
      ) : (
        <Text style={[styles.title, { color: theme.textPrimary }]}>
          Loading...
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
  },
  buttonWrap: {
    marginTop: 8,
    alignSelf: "stretch",
  },
});
