import { useAuth } from "@providers/AuthProvider";
import { Redirect, router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import Colors from "@/src/constants/Colors";

const AdminChoice = () => {
  const scheme = useColorScheme() ?? "light";
  const theme = Colors[scheme];
  const { session, loading, isAdmin, setActiveGroup } = useAuth();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.tint} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  if (!isAdmin) {
    return <Redirect href="/(user)" />;
  }

  const goToAdmin = () => {
    setActiveGroup("ADMIN");
    router.replace("/(admin)");
  };

  const goToUser = () => {
    setActiveGroup("USER");
    router.replace("/(user)");
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.textPrimary }]}>Choose where to continue</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        You can switch back to this page anytime from the Switch tab.
      </Text>

      <Pressable style={[styles.button, { backgroundColor: theme.tint }]} onPress={goToAdmin}>
        <Text style={[styles.buttonText, { color: theme.card }]}>Go to Admin Pages</Text>
      </Pressable>

      <Pressable style={[styles.button, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]} onPress={goToUser}>
        <Text style={[styles.buttonText, { color: theme.textPrimary }]}>Go to User Pages</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});

export default AdminChoice;
