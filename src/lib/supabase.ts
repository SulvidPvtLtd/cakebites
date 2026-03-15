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

const SECURE_STORE_CHUNK_SIZE = 1800;
const chunkCountKey = (key: string) => `${key}__chunk_count`;
const chunkKey = (key: string, index: number) => `${key}__chunk_${index}`;

const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    const countRaw = await SecureStore.getItemAsync(chunkCountKey(key));
    const chunkCount = countRaw ? Number(countRaw) : 0;
    if (Number.isFinite(chunkCount) && chunkCount > 0) {
      let value = "";
      for (let i = 0; i < chunkCount; i += 1) {
        const part = await SecureStore.getItemAsync(chunkKey(key, i));
        if (typeof part !== "string") {
          return null;
        }
        value += part;
      }
      return value;
    }

    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    const countRaw = await SecureStore.getItemAsync(chunkCountKey(key));
    const existingCount = countRaw ? Number(countRaw) : 0;
    if (Number.isFinite(existingCount) && existingCount > 0) {
      for (let i = 0; i < existingCount; i += 1) {
        await SecureStore.deleteItemAsync(chunkKey(key, i));
      }
    }
    await SecureStore.deleteItemAsync(chunkCountKey(key));
    await SecureStore.deleteItemAsync(key);

    const chunks: string[] = [];
    for (let i = 0; i < value.length; i += SECURE_STORE_CHUNK_SIZE) {
      chunks.push(value.slice(i, i + SECURE_STORE_CHUNK_SIZE));
    }

    await SecureStore.setItemAsync(chunkCountKey(key), String(chunks.length));
    for (let i = 0; i < chunks.length; i += 1) {
      await SecureStore.setItemAsync(chunkKey(key, i), chunks[i]);
    }
  },
  removeItem: async (key: string) => {
    const countRaw = await SecureStore.getItemAsync(chunkCountKey(key));
    const chunkCount = countRaw ? Number(countRaw) : 0;
    if (Number.isFinite(chunkCount) && chunkCount > 0) {
      for (let i = 0; i < chunkCount; i += 1) {
        await SecureStore.deleteItemAsync(chunkKey(key, i));
      }
    }
    await SecureStore.deleteItemAsync(chunkCountKey(key));
    await SecureStore.deleteItemAsync(key);
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

const supabaseHostIdentifier =
  supabaseUrl
    .replace(/^https?:\/\//i, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "unknown";
export const SUPABASE_AUTH_STORAGE_KEY = `sb-${supabaseHostIdentifier}-auth-token`;

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
