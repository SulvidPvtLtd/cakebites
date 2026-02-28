import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Redirect, Tabs } from "expo-router";
import React from "react";
import { ActivityIndicator, Alert, View } from "react-native";

import { useClientOnlyValue } from "../../components/useClientOnlyValue";
import { useColorScheme } from "../../components/useColorScheme";
import Colors from "../../constants/Colors";
import { useAuth } from "@/src/providers/AuthProvider";
import { supabase } from "@/src/lib/supabase";

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { session, loading, isAdmin, activeGroup } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />; // Redirect to the login page if the user is not authenticated
  }

  if (isAdmin && !activeGroup) {
    return <Redirect href="/admin-choice" />;
  }

  if (isAdmin && activeGroup === "ADMIN") {
    return <Redirect href="/(admin)" />; // Admins in admin mode should use admin tabs
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        tabBarStyle: {
          backgroundColor:
            colorScheme === "dark"
              ? "#121212" // Dark mode surface
              : "#FFFFFF", // Light mode surface
          borderTopWidth: 0,
          elevation: 0, // Android shadow
        },
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: useClientOnlyValue(false, true),
      }}
    >
      {/* Disable the "index" tab by setting href to null */}
      <Tabs.Screen name="index" options={{ href: null }} />

      <Tabs.Screen
        name="menu"
        options={{
          title: "Menu",
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "User Orders",
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon name="list" color={color} />,
        }}
      />
      <Tabs.Screen
        name="switch-mode"
        options={{
          title: "Switch",
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon name="exchange" color={color} />,
          href: isAdmin ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="log-out"
        options={{
          title: "Log out",
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="sign-out" color={color} />
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            Alert.alert(
              "Log out",
              "Are you sure you want to log out?",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Log out",
                  style: "destructive",
                  onPress: async () => {
                    const { error } = await supabase.auth.signOut();
                    if (error) {
                      await supabase.auth.signOut({ scope: "local" });
                    }
                  },
                },
              ]
            );
          },
        }}
      />
    </Tabs>
  );
}
