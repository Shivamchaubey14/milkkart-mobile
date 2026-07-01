// Serviceability helpers for the mobile app.
//
//  • detectPincode() — ask for (or reuse) foreground location permission, take a
//    coarse GPS fix and reverse-geocode it to a pincode. Fails soft: returns
//    null on denied permission, no fix, a slow fix, or any error, so callers can
//    fail OPEN (let the user into the app) rather than trap them behind a gate.
//  • getStoredPincode()/setStoredPincode() — a pincode the user manually picked
//    on the "not in your area" screen (via "Check another pincode"). When set it
//    overrides GPS so we don't re-prompt / re-detect every launch.
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";

const PINCODE_KEY = "mk_pincode";

// Give the GPS fix a hard ceiling so a device that never returns a position
// doesn't hang the splash — past this we fail open.
const FIX_TIMEOUT_MS = 6000;

export type DetectedLocation = { pincode: string; lat: number; lng: number; city?: string };

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    p,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

export async function detectPincode(): Promise<DetectedLocation | null> {
  try {
    let { status } = await Location.getForegroundPermissionsAsync();
    if (status !== "granted") {
      status = (await Location.requestForegroundPermissionsAsync()).status;
    }
    if (status !== "granted") return null;

    const pos = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }),
      FIX_TIMEOUT_MS,
    );
    if (!pos) return null;

    const { latitude, longitude } = pos.coords;
    const places = await Location.reverseGeocodeAsync({ latitude, longitude });
    const place = places[0];
    const pincode = place?.postalCode?.trim();
    if (!pincode) return null;

    return {
      pincode,
      lat: latitude,
      lng: longitude,
      city: place?.city || place?.subregion || place?.district || undefined,
    };
  } catch {
    return null;
  }
}

export async function getStoredPincode(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(PINCODE_KEY);
  } catch {
    return null;
  }
}

export async function setStoredPincode(pincode: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(PINCODE_KEY, pincode);
  } catch {
    /* best-effort — a failed persist just means we re-detect next launch */
  }
}

export async function clearStoredPincode(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(PINCODE_KEY);
  } catch {
    /* ignore */
  }
}
