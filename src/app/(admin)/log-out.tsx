import ProfileScreen from "@/src/components/ProfileScreen";
import { Stack } from "expo-router";

export default function AdminProfileScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ProfileScreen title="Administrator Profile" />
    </>
  );
}
