import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Screen } from "../../components/Screen";
import type { AdminStackParamList } from "../../navigation/AdminStack";
import { logout } from "../../store/authSlice";
import { clearTokens } from "../../store/secureTokens";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { colors, fonts, fontsAlt, spacing } from "../../theme";

type Nav = NativeStackNavigationProp<AdminStackParamList>;
type IconName = React.ComponentProps<typeof Ionicons>["name"];

// Every back-office section. "Orders" has a real screen; the rest open a
// placeholder for now and will get their own screens next.
const SECTIONS: { key: string; title: string; subtitle: string; icon: IconName; tint: string; fg: string }[] = [
  { key: "orders", title: "Orders", subtitle: "Confirm, cancel & assign", icon: "receipt-outline", tint: "#e8f2fc", fg: colors.info },
  { key: "catalog", title: "Catalog", subtitle: "Products & categories", icon: "pricetags-outline", tint: colors.greenTint, fg: colors.green },
  { key: "promotions", title: "Promotions", subtitle: "Coupons & banners", icon: "megaphone-outline", tint: "#fdecec", fg: colors.error },
  { key: "subscriptions", title: "Subscriptions", subtitle: "Plans & forecast", icon: "repeat-outline", tint: "#efe6f7", fg: "#7c5cd6" },
  { key: "riders", title: "Riders", subtitle: "Onboard & monitor", icon: "bicycle-outline", tint: "#fff4d6", fg: "#b98421" },
  { key: "import", title: "Bulk Import", subtitle: "Upload spreadsheets", icon: "cloud-upload-outline", tint: "#e8f2fc", fg: colors.info },
  { key: "dashboard", title: "Dashboard", subtitle: "Sales & reports", icon: "stats-chart-outline", tint: colors.greenTint, fg: colors.green },
  { key: "inventory", title: "Inventory", subtitle: "Stock & movements", icon: "cube-outline", tint: "#fff4d6", fg: "#b98421" },
  { key: "serviceability", title: "Serviceability", subtitle: "Areas & zones", icon: "map-outline", tint: "#efe6f7", fg: "#7c5cd6" },
  { key: "settings", title: "Settings", subtitle: "Store & ordering window", icon: "settings-outline", tint: "#eef1f3", fg: colors.heading },
];

export default function AdminHomeScreen() {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);

  const open = (s: (typeof SECTIONS)[number]) => {
    if (s.key === "orders") navigation.navigate("AdminOrders");
    else if (s.key === "catalog") navigation.navigate("AdminCatalog");
    else if (s.key === "dashboard") navigation.navigate("AdminDashboard");
    else if (s.key === "inventory") navigation.navigate("AdminInventory");
    else if (s.key === "riders") navigation.navigate("AdminRiders");
    else if (s.key === "promotions") navigation.navigate("AdminPromotions");
    else if (s.key === "settings") navigation.navigate("AdminSettings");
    else if (s.key === "subscriptions") navigation.navigate("AdminSubscriptions");
    else if (s.key === "serviceability") navigation.navigate("AdminServiceability");
    else if (s.key === "import") navigation.navigate("AdminBulkImport");
    else navigation.navigate("AdminSection", { key: s.key, title: s.title });
  };

  const onLogout = async () => {
    await clearTokens();
    dispatch(logout());
  };

  return (
    <Screen padded={false} style={{ backgroundColor: colors.bgSoft }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.blob} />
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Admin Console</Text>
              <Text style={styles.headerSub}>
                {(user?.name?.trim() || "Staff")} · {String(user?.role || "admin").toUpperCase()}
              </Text>
            </View>
            <Pressable style={styles.logoutBtn} onPress={onLogout} hitSlop={8}>
              <Ionicons name="log-out-outline" size={16} color={colors.error} />
              <Text style={styles.logoutText}>Logout</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.grid}>
          {SECTIONS.map((s) => (
            <Pressable key={s.key} style={styles.card} onPress={() => open(s)}>
              <View style={[styles.cardIcon, { backgroundColor: s.tint }]}>
                <Ionicons name={s.icon} size={22} color={s.fg} />
              </View>
              <Text style={styles.cardTitle}>{s.title}</Text>
              <Text style={styles.cardSub}>{s.subtitle}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing(4) },
  header: {
    backgroundColor: colors.heading,
    borderRadius: 26,
    marginHorizontal: spacing(2.5),
    marginTop: spacing(1),
    paddingHorizontal: spacing(2.5),
    paddingTop: spacing(2.5),
    paddingBottom: spacing(2.5),
    overflow: "hidden",
  },
  blob: { position: "absolute", top: -45, right: -30, width: 150, height: 150, borderRadius: 75, backgroundColor: "rgba(255,255,255,0.06)" },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing(1.5) },
  headerTitle: { fontFamily: fonts.bold, fontSize: 24, color: colors.white },
  headerSub: { fontFamily: fontsAlt.regular, fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 3 },
  logoutBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: colors.errorTint, borderRadius: 10, paddingVertical: spacing(0.85), paddingHorizontal: spacing(1.25) },
  logoutText: { fontFamily: fonts.bold, fontSize: 13, color: colors.error },

  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", paddingHorizontal: spacing(2.5), paddingTop: spacing(2.5) },
  card: {
    width: "48.5%",
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    padding: spacing(1.75),
    marginBottom: spacing(2),
    shadowColor: "#1c2b36",
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: spacing(1.25) },
  cardTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.heading },
  cardSub: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginTop: 2, lineHeight: 16 },
});
