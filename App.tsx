import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider } from "react-redux";
import { StatusBar } from "expo-status-bar";
import {
  useFonts,
  Quicksand_400Regular,
  Quicksand_500Medium,
  Quicksand_600SemiBold,
  Quicksand_700Bold,
} from "@expo-google-fonts/quicksand";
import {
  NunitoSans_400Regular,
  NunitoSans_600SemiBold,
  NunitoSans_700Bold,
  NunitoSans_800ExtraBold,
} from "@expo-google-fonts/nunito-sans";

import { api } from "./src/api/baseApi";
import { ToastProvider } from "./src/components/Toast";
import { LanguageProvider } from "./src/i18n/LanguageProvider";
import RootNavigator from "./src/navigation/RootNavigator";
import ServiceabilityGate from "./src/serviceability/ServiceabilityGate";
import SplashScreen from "./src/screens/SplashScreen";
import { store } from "./src/store";
import { bootstrapped, setUser } from "./src/store/authSlice";
import { loadTokens } from "./src/store/secureTokens";
import { hydrateWishlist } from "./src/store/wishlistSlice";
import { loadWishlist } from "./src/store/wishlistStorage";

// Loads any saved tokens from secure storage before showing the app, so a
// returning user lands straight in the main app instead of the login screen.
function Boot() {
  const [ready, setReady] = useState(false);
  const [fontsLoaded] = useFonts({
    Quicksand_400Regular,
    Quicksand_500Medium,
    Quicksand_600SemiBold,
    Quicksand_700Bold,
    NunitoSans_400Regular,
    NunitoSans_600SemiBold,
    NunitoSans_700Bold,
    NunitoSans_800ExtraBold,
  });
  useEffect(() => {
    (async () => {
      const { access, refresh } = await loadTokens();
      store.dispatch(bootstrapped({ access, refresh }));
      loadWishlist().then((items) => store.dispatch(hydrateWishlist(items)));
      setReady(true);
      // A returning user skips the login screen (which is what fetches the
      // profile), so load it here too — otherwise `user` stays null and the
      // name/email/avatar render blank until the next login.
      if (access) {
        try {
          const me = await store.dispatch(api.endpoints.me.initiate()).unwrap();
          store.dispatch(setUser(me));
        } catch {
          /* best-effort — the app still works without the cached profile */
        }
      }
    })();
  }, []);

  // Branded splash while tokens + fonts load, so the first frame is the logo
  // rather than a bare spinner.
  if (!ready || !fontsLoaded) {
    return <SplashScreen />;
  }
  return (
    <ServiceabilityGate>
      <RootNavigator />
    </ServiceabilityGate>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <LanguageProvider>
          <ToastProvider>
            <Boot />
          </ToastProvider>
        </LanguageProvider>
      </SafeAreaProvider>
    </Provider>
  );
}
