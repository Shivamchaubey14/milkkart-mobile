// ───────────────────────────────────────────────────────────────────────────
// Backend base URL.
//
// A PHYSICAL PHONE cannot reach your computer's "localhost". The backend must be
// running on 0.0.0.0:8000  (python manage.py runserver 0.0.0.0:8000).
//
// We don't hardcode the LAN IP. Instead we read the IP that the phone used to
// reach the Expo dev server (Constants.*.hostUri / debuggerHost) and point the
// API at that same machine on :8000. This means the app works on WHATEVER
// network you're connected through — home Wi-Fi, mobile hotspot, etc. — with no
// edits when the IP changes. FALLBACK_HOST is only used if that lookup fails
// (e.g. a production/standalone build).
//   • Android emulator → http://10.0.2.2:8000/api/v1
//   • iOS simulator    → http://localhost:8000/api/v1
//   • Physical phone   → derived automatically from the Expo host
// ───────────────────────────────────────────────────────────────────────────
import Constants from "expo-constants";

const FALLBACK_HOST = "192.168.71.160";

// The "host:port" the phone used to load the JS bundle from the Expo packager.
// Covers SDK 49+ (expoConfig.hostUri), Expo Go (manifest2), and classic manifest.
function expoHostUri(): string | undefined {
  const anyC = Constants as any;
  return (
    anyC.expoConfig?.hostUri ??
    anyC.manifest2?.extra?.expoGo?.debuggerHost ??
    anyC.manifest?.debuggerHost ??
    anyC.manifest?.hostUri
  );
}

// Strip the packager port and any scheme, leaving just the host/IP.
function devHost(): string {
  const uri = expoHostUri();
  const host = uri?.split("://").pop()?.split(":")[0]?.trim();
  return host && host.length > 0 ? host : FALLBACK_HOST;
}

export const API_BASE = `http://${devHost()}:8000/api/v1`;

// Catalog/product images are served by the web storefront (milkkart-web on
// :3000), not the backend, and `image_url` is a path relative to that origin.
// Derive the web origin from API_BASE so there's only one IP to update.
export const IMAGE_BASE = API_BASE.replace(/:\d+\/.*$/, ":3000");

// Resolve a catalog image_url to a full URL the <Image> can load. Returns null
// for empty paths; passes through absolute http(s)/data URLs unchanged.
export function imageUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^(https?:|data:)/.test(path)) return path;
  return `${IMAGE_BASE}/${path.replace(/^\//, "")}`;
}
