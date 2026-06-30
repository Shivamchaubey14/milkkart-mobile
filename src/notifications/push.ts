// Push + local notification helpers.
//
// Two delivery paths are supported (see the feature spec):
//   • Remote push — the backend sends an Expo push when an order is assigned.
//     Works even when the app is backgrounded/closed, but on Android this needs
//     a development build (Expo Go on SDK 53+ can't receive remote push).
//   • In-app local alert — while the rider app is open we detect a new
//     assignment and call presentLocalAlert(), which fires a local notification
//     with sound + vibration. Works in Expo Go today.
//
// Both paths share the same Android channel (sound + vibration) and foreground
// handler so the phone shows a banner, rings and buzzes either way.

import { Platform, Vibration } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

// Expo Go (SDK 53+) dropped remote push on Android. Detect it so we skip the
// remote-token call (which otherwise logs a native error) and rely on the
// in-app local alert path instead.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// A noticeable buzz pattern (ms): wait, vibrate, pause, vibrate.
export const VIBRATION_PATTERN = [0, 400, 200, 400];

const ANDROID_CHANNEL_ID = "default";

// Foreground handler — by default a notification that arrives while the app is
// open is silent; this makes it show a banner, play the sound and buzz.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Android needs a high-importance channel for heads-up banners + sound + vibration.
export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: "Delivery alerts",
    importance: Notifications.AndroidImportance.MAX,
    sound: "default",
    vibrationPattern: VIBRATION_PATTERN,
    enableVibrate: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

// Vibrate the phone right now (extra insurance; iOS foreground especially).
export function buzz(): void {
  Vibration.vibrate(VIBRATION_PATTERN);
}

// Continuous "incoming order" ring — loops the buzz until stopRinging() is
// called (e.g. the rider taps Accept). Works while the app is running
// (foreground, or after the rider taps the push to open it). A fully-killed app
// can't run JS, so the one-shot push-channel vibration is all that fires then.
const RING_PATTERN = [0, 700, 500];
let ringing = false;
export function startRinging(): void {
  if (ringing) return;
  ringing = true;
  Vibration.vibrate(RING_PATTERN, true); // repeat=true → loop until cancelled
}
export function stopRinging(): void {
  if (!ringing) return;
  ringing = false;
  Vibration.cancel();
}

// Ask permission and return this device's Expo push token, or null if it can't
// be obtained (simulator, denied permission, or Expo Go remote-push limits).
export async function registerForPushToken(): Promise<string | null> {
  await ensureAndroidChannel();

  if (!Device.isDevice) return null;

  const existing = await Notifications.getPermissionsAsync();
  let granted = existing.granted || existing.status === "granted";
  if (!granted) {
    const asked = await Notifications.requestPermissionsAsync();
    granted = asked.granted || asked.status === "granted";
  }
  if (!granted) return null;

  // Expo Go can't mint a remote token on Android — bail before calling the
  // native API (avoids the "removed from Expo Go" error). Local alerts still run.
  if (isExpoGo) return null;

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;
    const token = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return token.data;
  } catch {
    // Expo Go on Android can't mint a remote token — that's expected; the
    // in-app local alert path still works.
    return null;
  }
}

// Show a local notification immediately and buzz — the in-app alert path.
export async function presentLocalAlert(
  title: string,
  body: string,
  data: Record<string, unknown> = {},
): Promise<void> {
  await ensureAndroidChannel();
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data, sound: "default", vibrate: VIBRATION_PATTERN },
    trigger: null, // deliver now
  });
  buzz();
}
