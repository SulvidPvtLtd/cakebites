import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

let isNotificationHandlerConfigured = false;
let hasLoggedMissingProjectIdWarning = false;

const resolveProjectId = () => {
  const envProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (typeof envProjectId === "string" && envProjectId.trim().length > 0) {
    return envProjectId;
  }

  const easProjectId = Constants?.easConfig?.projectId;
  if (typeof easProjectId === "string" && easProjectId.trim().length > 0) {
    return easProjectId;
  }

  const expoExtra = Constants?.expoConfig?.extra as
    | { eas?: { projectId?: string } }
    | undefined;
  const extraProjectId = expoExtra?.eas?.projectId;
  if (typeof extraProjectId === "string" && extraProjectId.trim().length > 0) {
    return extraProjectId;
  }

  return null;
};

export const configureForegroundNotificationHandling = () => {
  if (isNotificationHandlerConfigured) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  isNotificationHandlerConfigured = true;
};

export const registerForPushNotificationsAsync = async (): Promise<string | null> => {
  if (Platform.OS === "web") return null;

  configureForegroundNotificationHandling();

  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("order-status", {
        name: "Order Status Updates",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 150, 250],
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const permissionRequest = await Notifications.requestPermissionsAsync();
      finalStatus = permissionRequest.status;
    }

    if (finalStatus !== "granted") {
      return null;
    }

    const projectId = resolveProjectId();
    if (!projectId) {
      if (!hasLoggedMissingProjectIdWarning) {
        console.log(
          "Push notification registration skipped: missing Expo EAS projectId. Set EXPO_PUBLIC_EAS_PROJECT_ID in .env or configure expo.extra.eas.projectId."
        );
        hasLoggedMissingProjectIdWarning = true;
      }
      return null;
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });

    return tokenResponse.data ?? null;
  } catch (error) {
    console.log(
      "Push notification registration failed:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
};
