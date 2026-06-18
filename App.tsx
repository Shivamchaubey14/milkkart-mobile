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

import RootNavigator from "./src/navigation/RootNavigator";
import SplashScreen from "./src/screens/SplashScreen";
import { store } from "./src/store";
import { bootstrapped } from "./src/store/authSlice";
import { loadTokens } from "./src/store/secureTokens";

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
      setReady(true);
    })();
  }, []);

  // Branded splash while tokens + fonts load, so the first frame is the logo
  // rather than a bare spinner.
  if (!ready || !fontsLoaded) {
    return <SplashScreen />;
  }
  return <RootNavigator />;
}

export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Boot />
      </SafeAreaProvider>
    </Provider>
  );
}
