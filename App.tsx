import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider } from "react-redux";
import { StatusBar } from "expo-status-bar";

import RootNavigator from "./src/navigation/RootNavigator";
import { store } from "./src/store";
import { bootstrapped } from "./src/store/authSlice";
import { loadTokens } from "./src/store/secureTokens";
import { colors } from "./src/theme";

// Loads any saved tokens from secure storage before showing the app, so a
// returning user lands straight in the main app instead of the login screen.
function Boot() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    (async () => {
      const { access, refresh } = await loadTokens();
      store.dispatch(bootstrapped({ access, refresh }));
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.green} />
      </View>
    );
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
