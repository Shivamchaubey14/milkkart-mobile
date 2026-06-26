import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

import { useRegisterDeviceMutation } from "../api/baseApi";
import { buzz, registerForPushToken } from "./push";

// Mounted once the user is authenticated. Registers this device's Expo push
// token with the backend (so remote push can reach it) and buzzes the phone
// when a push arrives while the app is foregrounded.
export default function PushRegistrar() {
  const [registerDevice] = useRegisterDeviceMutation();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await registerForPushToken();
      if (cancelled || !token) return;
      const platform = Platform.OS === "ios" ? "ios" : "android";
      try {
        await registerDevice({ token, platform }).unwrap();
      } catch {
        /* best-effort — a failed registration shouldn't disrupt the app */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [registerDevice]);

  // Extra buzz when a notification lands while the app is open (the foreground
  // handler plays the sound; this guarantees a vibration too, e.g. on iOS).
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(() => buzz());
    return () => sub.remove();
  }, []);

  return null;
}
