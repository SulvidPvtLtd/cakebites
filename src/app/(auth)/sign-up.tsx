import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import React, { useState } from 'react';
import Button from '../../components/Button';
import Colors from '../../constants/Colors';
import { Link, Stack } from 'expo-router';
import { supabase } from '@/src/lib/supabase'; // supabase client

const SignUpScreen = () => {

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');

  // Track the loading state to prevent multiple sign-up attempts
  const [loading, setLoading] = useState(false);

  async function signUpWithEmail() {
    setLoading(true); // sign up starts

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
        Alert.alert('Error signing up', signupResponse.error.message);
        return;
      }

      const newUser = signupResponse.data.user;
      if (newUser) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(
            {
              id: newUser.id,
              email: normalizedEmail,
              mobile_number: normalizedMobile,
              group: 'USER',
            },
            { onConflict: 'id' },
          );

        if (profileError) {
          Alert.alert(
            'Account created',
            `Account was created, but profile setup failed: ${profileError.message}`,
          );
          return;
        }
      }

      Alert.alert(
        'Success',
        'Account created successfully! Please check your email to confirm your account.',
      );
    } finally {
      setLoading(false); // sign up ends
    }
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Sign up' }} />

      <Text style={styles.label}>Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="jon@gmail.com"
        style={styles.input}
        editable
        autoFocus
        keyboardType="default"
      />

      <Text style={styles.label}>Password</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder=""
        style={styles.input}
        secureTextEntry
        editable
        autoFocus
        keyboardType="default"
      />

      <Text style={styles.label}>Mobile Number</Text>
      <TextInput
        value={mobileNumber}
        onChangeText={setMobileNumber}
        placeholder="+27 82 123 4567"
        style={styles.input}
        editable
        keyboardType="phone-pad"
      />

      <Button onPress={signUpWithEmail} disabled={loading}   text={loading ? "Creating account..." : "Create account"} />
      <Link href="/sign-in" style={styles.textButton}>
        Sign in
      </Link>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    justifyContent: 'center',
    flex: 1,
  },
  label: {
    color: 'gray',
  },
  input: {
    borderWidth: 1,
    borderColor: 'gray',
    padding: 10,
    marginTop: 5,
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 5,
  },
  textButton: {
    alignSelf: 'center',
    fontWeight: 'bold',
    color: Colors.light.tint,
    marginVertical: 10,
  },
});

export default SignUpScreen;
