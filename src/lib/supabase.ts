/*
  This file is responsible for setting up the Supabase client with the
  appropriate configuration for authentication in a React Native environment using Expo.
  It uses the `expo-secure-store` library to securely store authentication
  tokens and session information.
*/
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import "react-native-url-polyfill/auto";
import { Database } from "../database.types";

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    return SecureStore.deleteItemAsync(key);
  },
};

const envSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const localSupabaseHost =
  process.env.EXPO_PUBLIC_LOCAL_SUPABASE_HOST?.trim() || "10.0.2.2";

const supabaseUrl =
  envSupabaseUrl ||
  Platform.select({
    ios: "http://127.0.0.1:54321",
    // Android emulator can access host machine via 10.0.2.2.
    // For physical Android + local Supabase, set EXPO_PUBLIC_LOCAL_SUPABASE_HOST to your PC LAN IP.
    android: `http://${localSupabaseHost}:54321`,
    default: "http://192.168.0.221:54321",
  });

const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variable. Set EXPO_PUBLIC_SUPABASE_ANON_KEY and optionally EXPO_PUBLIC_SUPABASE_URL in .env.",
  );
}

const supabaseProjectRef =
  supabaseUrl.split("//")[1]?.split(".")[0] ?? "unknown";
export const SUPABASE_AUTH_STORAGE_KEY = `sb-${supabaseProjectRef}-auth-token`;

// Assign <Database> so that the Supabase client
// is aware of the database schema and types to use. Currently without it, it will use `any` types.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter as any,
    storageKey: SUPABASE_AUTH_STORAGE_KEY,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
