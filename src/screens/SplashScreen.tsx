import { ActivityIndicator, StyleSheet, View } from "react-native";

import { BrandLogo } from "../components/Logo";
import { colors, spacing } from "../theme";

// Shown while the app boots (restoring the saved session and loading fonts).
// The full brand lock-up sits centered on a clean canvas with a subtle spinner
// below, so the very first frame already feels like MilkKart.
export default function SplashScreen() {
  return (
    <View style={styles.root}>
      <View style={styles.center}>
        <BrandLogo width={260} />
      </View>
      <ActivityIndicator style={styles.spinner} color={colors.green} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  center: { alignItems: "center", justifyContent: "center" },
  spinner: { position: "absolute", bottom: spacing(8) },
});
