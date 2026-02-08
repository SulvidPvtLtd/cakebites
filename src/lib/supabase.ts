/*
  This file is responsible for setting up the Supabase client with the 
  appropriate configuration for authentication in a React Native environment using Expo. 
  It uses the `expo-secure-store` library to securely store authentication 
  tokens and session information.
*/
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import "react-native-url-polyfill/auto";

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    SecureStore.deleteItemAsync(key);
  },
};

const supabaseUrl = "https://ctfirvzwlecmpwhfgvyy.supabase.co";
const supabaseAnonKey = "sb_publishable_bSkket750hZFRKNuJAorqA_mho6hHa8";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
