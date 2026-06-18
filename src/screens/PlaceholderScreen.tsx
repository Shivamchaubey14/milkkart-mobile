import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { Screen } from "../components/Screen";
import { colors, fonts, fontsAlt, spacing } from "../theme";

// Lightweight "coming soon" screen used by tabs whose features land in later
// slices (Alerts, Wishlist, Cart). Built so each tab still has a real screen.
export default function PlaceholderScreen({
  title,
  icon,
}: {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
}) {
  return (
    <Screen>
      <View style={styles.root}>
        <View style={styles.badge}>
          <Ionicons name={icon} size={34} color={colors.green} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>Coming soon.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center" },
  badge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.greenTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing(2),
  },
  title: { fontFamily: fonts.bold, fontSize: 20, color: colors.heading },
  sub: { fontFamily: fontsAlt.regular, fontSize: 14, color: colors.muted, marginTop: spacing(0.5) },
});
