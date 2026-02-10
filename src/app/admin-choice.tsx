import { useAuth } from "@providers/AuthProvider";
import { Redirect, router } from "expo-router";
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

const AdminChoice = () => {
  const { session, loading, isAdmin, setActiveGroup } = useAuth();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
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
    <View style={styles.container}>
      <Text style={styles.title}>Choose where to continue</Text>
      <Text style={styles.subtitle}>
        You can switch back to this page anytime from the Switch tab.
      </Text>

      <Pressable style={[styles.button, styles.adminButton]} onPress={goToAdmin}>
        <Text style={styles.buttonText}>Go to Admin Pages</Text>
      </Pressable>

      <Pressable style={[styles.button, styles.userButton]} onPress={goToUser}>
        <Text style={styles.buttonText}>Go to User Pages</Text>
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
    color: "#555",
    marginBottom: 24,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  adminButton: {
    backgroundColor: "#0B5D48",
  },
  userButton: {
    backgroundColor: "#111827",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default AdminChoice;
