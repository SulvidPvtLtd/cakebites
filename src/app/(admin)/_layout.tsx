import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Redirect, Tabs } from "expo-router";
import React from "react";
import { ActivityIndicator, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useClientOnlyValue } from "../../components/useClientOnlyValue";
import { useColorScheme } from "../../components/useColorScheme";
import Colors from "../../constants/Colors";
import { useAuth } from "@/src/providers/AuthProvider";

const ADMIN_TAB_BAR_HEIGHT = 52;
const ADMIN_TAB_BAR_TARGET_GAP = 32;

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  return <FontAwesome size={30} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const { session, loading, isAdmin, activeGroup } = useAuth();
  const insets = useSafeAreaInsets();
  const rawBottomInset = insets?.bottom ?? 0;
  const adjustedBottomInset = Math.min(
    rawBottomInset,
    ADMIN_TAB_BAR_TARGET_GAP,
  );
  const tabBarHeight = ADMIN_TAB_BAR_HEIGHT + adjustedBottomInset;

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
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

  if (!activeGroup) {
    return <Redirect href="/admin-choice" />;
  }

  if (activeGroup !== "ADMIN") {
    return <Redirect href="/(user)" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.tint,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopWidth: 0,
          elevation: 0,
          height: tabBarHeight,
          paddingBottom: adjustedBottomInset,
          paddingTop: 2,
        },
        headerShown: useClientOnlyValue(false, true),
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen
        name="menu"
        options={{
          title: "Admin Menu",
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: "Inventory",
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon name="archive" color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Admin Orders",
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon name="list" color={color} />,
        }}
      />
      <Tabs.Screen
        name="delivery-settings"
        options={{
          title: "Delivery Settings",
          headerShown: false,
          href: null,
        }}
      />
      <Tabs.Screen
        name="switch-mode"
        options={{
          title: "Switch",
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon name="exchange" color={color} />,
        }}
      />
      <Tabs.Screen
        name="log-out"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
        }}
      />
    </Tabs>
  );
}
