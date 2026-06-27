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

// PUBLIC backend URL used by standalone/preview builds (an .apk), which can't
// reach a LAN IP or auto-detect the Expo host. Point this at a tunnel/deploy of
// the backend (currently an ngrok tunnel of :8000) and REBUILD if it changes.
// In the Expo dev server this is ignored — the host is derived live instead.
const PROD_API_ORIGIN = "https://apolonia-unvouchsafed-joy.ngrok-free.dev";

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

// Dev (Expo Go / dev server): the phone reached the packager on some host — use
// that machine on :8000. Returns null when there's no packager (a standalone build).
function devApiBase(): string | null {
  const host = expoHostUri()?.split("://").pop()?.split(":")[0]?.trim();
  return host && host.length > 0 ? `http://${host}:8000/api/v1` : null;
}

export const API_BASE = devApiBase() ?? `${PROD_API_ORIGIN}/api/v1`;

// Product images are uploaded to and served by the BACKEND (under /media/). The
// API returns either an absolute URL (passed through by imageUrl) or a relative
// /media/... path, which resolves against the backend origin below. So IMAGE_BASE
// is simply the API origin without the /api/v1 suffix.
export const IMAGE_BASE = API_BASE.replace(/\/api\/v1\/?$/, "");

// Resolve a catalog image_url to a full URL the <Image> can load. Returns null
// for empty paths; passes through absolute http(s)/data URLs unchanged.
export function imageUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^(https?:|data:)/.test(path)) return path;
  return `${IMAGE_BASE}/${path.replace(/^\//, "")}`;
}
