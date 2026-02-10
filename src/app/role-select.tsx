import { useAuth } from "@providers/AuthProvider";
import { Redirect, router } from "expo-router";
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Colors from "@/src/constants/Colors";
import { useColorScheme } from "@/src/components/useColorScheme";
import { supabase } from "@/src/lib/supabase";

export default function RoleSelect() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const { session, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (!isAdmin) {
    return <Redirect href="/(user)" />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Choose a mode</Text>

        <Pressable
          onPress={() => router.replace("/(user)")}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.tint },
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonText}>User</Text>
        </Pressable>

        <Pressable
          onPress={() => router.replace("/(admin)")}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.tint },
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonText}>Admin</Text>
        </Pressable>

        <Pressable
          onPress={() => supabase.auth.signOut()}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.tint },
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonText}>Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    gap: 16,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16,
  },
  button: {
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
