import { View, Text, TextInput, StyleSheet, Alert, useColorScheme } from "react-native";
import React, { useState } from "react";
import Button from "../../components/Button";
import Colors from "../../constants/Colors";
import { Link, Stack } from "expo-router";
import { supabase } from "@/src/lib/supabase";

const SignUpScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const scheme = useColorScheme() ?? "light";
  const theme = Colors[scheme];

  async function signUpWithEmail() {
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedMobile = mobileNumber.trim() || null;

      const signupResponse = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            mobile_number: normalizedMobile,
          },
        },
      });

      if (signupResponse.error) {
        Alert.alert("Error signing up", signupResponse.error.message);
        return;
      }

      Alert.alert(
        "Success",
        "Account created successfully! Please check your email to confirm your account."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ title: "Sign up" }} />

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
        editable
        autoFocus
        keyboardType="default"
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
        editable
        keyboardType="default"
      />

      <Text style={[styles.label, { color: theme.textSecondary }]}>Mobile Number</Text>
      <TextInput
        value={mobileNumber}
        onChangeText={setMobileNumber}
        placeholder="+27 82 123 4567"
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.input,
          { borderColor: theme.border, backgroundColor: theme.card, color: theme.textPrimary },
        ]}
        editable
        keyboardType="phone-pad"
      />

      <Button
        onPress={signUpWithEmail}
        disabled={loading}
        text={loading ? "Creating account..." : "Create account"}
      />
      <Link href="/sign-in" style={[styles.textButton, { color: theme.tint }]}>
        Sign in
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

export default SignUpScreen;
