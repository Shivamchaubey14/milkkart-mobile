import { StyleSheet, Text, View } from "react-native";

import { Screen } from "../components/Screen";
import { useAppSelector } from "../store/hooks";
import { colors, font, radius, spacing } from "../theme";

export default function HomeScreen() {
  const user = useAppSelector((s) => s.auth.user);
  return (
    <Screen>
      <Text style={styles.hi}>Hi, {user?.name || user?.phone || "there"} 👋</Text>
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>Fresh dairy, delivered fast</Text>
        <Text style={styles.bannerSub}>⚡ Blazing fast delivery in 15–30 min</Text>
      </View>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>
          Catalog, search, cart and subscriptions land here next.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hi: { fontSize: font.h2, fontWeight: "700", color: colors.heading, marginTop: spacing(1), marginBottom: spacing(2) },
  banner: {
    backgroundColor: colors.green,
    borderRadius: radius.lg,
    padding: spacing(2.5),
  },
  bannerTitle: { color: colors.white, fontSize: font.h2, fontWeight: "800" },
  bannerSub: { color: "rgba(255,255,255,0.92)", marginTop: spacing(0.75), fontWeight: "600" },
  placeholder: {
    marginTop: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing(3),
    alignItems: "center",
  },
  placeholderText: { color: colors.muted, textAlign: "center" },
});
