import { ReactNode, useCallback, useEffect, useState } from "react";

import { useLazyServiceabilityCheckQuery } from "../api/baseApi";
import { detectPincode, getStoredPincode } from "../location/serviceability";
import SplashScreen from "../screens/SplashScreen";
import ServiceNotAvailableScreen from "../screens/ServiceNotAvailableScreen";
import { useAppSelector } from "../store/hooks";

// Back-office roles + riders are never gated on delivery serviceability — they
// need to reach their apps from anywhere (same list RootNavigator routes on).
const EXEMPT_ROLES = ["admin", "ops", "warehouse", "support"];

type GateState =
  | { status: "checking" }
  | { status: "ok" }
  | { status: "blocked"; pincode?: string; city?: string };

/**
 * Wraps the app and, for regular customers, blocks it behind the
 * "not in your area" screen when their detected (or chosen) pincode isn't
 * serviceable. Runs on app open AND re-runs when the auth token changes (i.e.
 * right after login), so someone signing in from an unserviced area is caught
 * too. Staff/riders are always let through. Fails OPEN — any detection or
 * network problem lets the user in rather than trapping them.
 */
export default function ServiceabilityGate({ children }: { children: ReactNode }) {
  const access = useAppSelector((s) => s.auth.access);
  const user = useAppSelector((s) => s.auth.user);
  const isExempt = !!user && (EXEMPT_ROLES.includes(user.role) || !!user.is_rider);
  // If we're signed in but the profile (hence role) hasn't loaded yet, wait —
  // otherwise a staff member could flash the block screen before we know to
  // exempt them.
  const roleResolved = !access || !!user;

  const [state, setState] = useState<GateState>({ status: "checking" });
  const [checkServiceability] = useLazyServiceabilityCheckQuery();

  const runCheck = useCallback(async () => {
    setState({ status: "checking" });

    // A pincode the user manually confirmed on the block screen wins over GPS.
    const stored = await getStoredPincode();
    if (stored) {
      try {
        const res = await checkServiceability({ pincode: stored }).unwrap();
        setState(res.serviceable ? { status: "ok" } : { status: "blocked", pincode: stored });
      } catch {
        setState({ status: "ok" }); // fail open
      }
      return;
    }

    const detected = await detectPincode();
    if (!detected) {
      setState({ status: "ok" }); // can't detect → fail open
      return;
    }
    try {
      const res = await checkServiceability({
        pincode: detected.pincode,
        lat: detected.lat,
        lng: detected.lng,
      }).unwrap();
      setState(
        res.serviceable
          ? { status: "ok" }
          : { status: "blocked", pincode: detected.pincode, city: detected.city },
      );
    } catch {
      setState({ status: "ok" }); // fail open
    }
  }, [checkServiceability]);

  // Re-run on mount and whenever the session token changes (login/logout).
  useEffect(() => {
    runCheck();
  }, [runCheck, access]);

  if (isExempt) return <>{children}</>;
  if (!roleResolved || state.status === "checking") return <SplashScreen />;
  if (state.status === "blocked") {
    return (
      <ServiceNotAvailableScreen
        detectedPincode={state.pincode}
        detectedCity={state.city}
        onServiceable={runCheck}
      />
    );
  }
  return <>{children}</>;
}
