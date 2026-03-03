import ProfileScreen from "@/src/components/ProfileScreen";
import { Stack } from "expo-router";

export default function UserProfileScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ProfileScreen title="My Profile" />
    </>
  );
}
