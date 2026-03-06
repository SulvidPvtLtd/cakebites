import { supabase } from "@/src/lib/supabase";
import { Link, Stack } from "expo-router";
import React, { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View, useColorScheme } from "react-native";
import Button from "../../components/Button";
import Colors from "../../constants/Colors";

const SignInScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const scheme = useColorScheme() ?? "light";
  const theme = Colors[scheme];

  async function signInWithEmail() {
    setLoading(true);
    const signupResponse = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signupResponse.error) {
      Alert.alert("Error signing in", signupResponse.error.message);
    }

    setLoading(false);
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ title: "Sign in" }} />

      <Text style={[styles.label, { color: theme.textSecondary }]}>Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="jon@gmail.com"
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.input,
          { borderColor: theme.border, backgroundColor: theme.card, color: theme.textPrimary },
        ]}
      />

      <Text style={[styles.label, { color: theme.textSecondary }]}>Password</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder=""
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.input,
          { borderColor: theme.border, backgroundColor: theme.card, color: theme.textPrimary },
        ]}
        secureTextEntry
      />

      <Button
        onPress={signInWithEmail}
        disabled={loading}
        text={loading ? "Signing in..." : "Sign in"}
      />
      <Link href="/sign-up" style={[styles.textButton, { color: theme.tint }]}>
        Create an account
      </Link>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    justifyContent: "center",
    flex: 1,
  },
  label: {
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    padding: 10,
    marginTop: 5,
    marginBottom: 20,
    borderRadius: 10,
  },
  textButton: {
    alignSelf: "center",
    fontWeight: "bold",
    marginVertical: 10,
  },
});

export default SignInScreen;
