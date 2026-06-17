import { StyleSheet, Text, View } from "react-native";

import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { logout } from "../store/authSlice";
import { clearTokens } from "../store/secureTokens";
import { colors, font, radius, spacing } from "../theme";

export default function ProfileScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();

  async function onLogout() {
    await clearTokens();
    dispatch(logout());
  }

  const row = (label: string, value?: string) => (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value || "—"}</Text>
    </View>
  );

  return (
    <Screen>
      <Text style={styles.title}>Profile</Text>
      <View style={styles.card}>
        {row("Name", user?.name)}
        {row("Phone", user?.phone)}
        {row("Email", user?.email)}
        {row("Role", user?.role)}
      </View>
      <Button title="Log out" variant="outline" onPress={onLogout} style={{ marginTop: spacing(2) }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: font.h2, fontWeight: "700", color: colors.heading, marginVertical: spacing(2) },
  card: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: spacing(2) },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing(1) },
  rowLabel: { color: colors.muted, fontSize: font.body },
  rowValue: { color: colors.heading, fontSize: font.body, fontWeight: "600" },
});
