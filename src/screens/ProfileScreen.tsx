import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { useWalletQuery } from "../api/baseApi";
import { Screen } from "../components/Screen";
import { useToast } from "../components/Toast";
import type { ProfileStackParamList } from "../navigation/ProfileStack";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { logout } from "../store/authSlice";
import { clearTokens } from "../store/secureTokens";
import { colors, fonts, fontsAlt, spacing } from "../theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

type MenuItem = {
  key: string;
  icon: IoniconName;
  tint: string;
  fg: string;
  title: string;
  subtitle: string;
  badge?: string;
  value?: string;
};

const MENU: MenuItem[] = [
  {
    key: "profile",
    icon: "location-outline",
    tint: colors.greenTint,
    fg: colors.green,
    title: "Profile & addresses",
    subtitle: "Personal info, saved addresses",
  },
  {
    key: "orders",
    icon: "receipt-outline",
    tint: "#fff4d6",
    fg: "#b98421",
    title: "My Orders",
    subtitle: "Track & reorder",
  },
  {
    key: "subscriptions",
    icon: "repeat-outline",
    tint: colors.greenTint,
    fg: colors.green,
    title: "Subscriptions",
    subtitle: "Daily milk & bread plans",
    badge: "2 active",
  },
  {
    key: "wallet",
    icon: "card-outline",
    tint: colors.lineSoft,
    fg: colors.heading,
    title: "Wallet",
    subtitle: "Balance & transactions",
  },
  {
    key: "support",
    icon: "help-circle-outline",
    tint: colors.lineSoft,
    fg: colors.heading,
    title: "Help & Support",
    subtitle: "FAQs, chat with us",
  },
];

type RiderStat = { key: string; icon: IoniconName; tint: string; fg: string; title: string; value: string; valueColor: string };

// Rider-only stat rows shown after "Profile & addresses" (mock values for now).
const RIDER_STATS: RiderStat[] = [
  { key: "delivered", icon: "checkmark-done-outline", tint: colors.greenTint, fg: colors.green, title: "Total Delivered", value: "128", valueColor: colors.heading },
  { key: "pending", icon: "time-outline", tint: "#fff4d6", fg: "#b98421", title: "Total Pending", value: "4", valueColor: colors.heading },
  { key: "earnings", icon: "cash-outline", tint: colors.greenTint, fg: colors.green, title: "Total Earnings", value: "₹12,480.00", valueColor: colors.green },
  { key: "pendingSince", icon: "calendar-outline", tint: colors.lineSoft, fg: colors.heading, title: "Total Pending Since", value: "24 Jun", valueColor: colors.muted },
];

export default function ProfileScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  const toast = useToast();
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const isRider = !!user?.is_rider;
  // Riders see stat rows, not the wallet/orders menu — skip the wallet fetch.
  const { data: wallet, isFetching, refetch } = useWalletQuery(undefined, { skip: isRider });
  const menu = isRider ? MENU.filter((m) => m.key === "profile") : MENU;

  const initial = (user?.name?.trim()?.[0] || "U").toUpperCase();

  async function onLogout() {
    await clearTokens();
    dispatch(logout());
    // RootNavigator swaps to the Sign In screen once the token is cleared.
  }

  return (
    <Screen padded={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.green} colors={[colors.green]} />
        }
      >
        {/* Dark header — title + user identity. */}
        <View style={styles.header}>
          <View style={styles.blob} />
          <Text style={styles.headerTitle}>Profile</Text>

          <View style={styles.userRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={2}>
                {user?.name || "MilkKart user"}
              </Text>
              <Text style={styles.userPhone}>{user?.phone || ""}</Text>
            </View>
          </View>
        </View>

        {/* Menu list */}
        <View style={styles.menu}>
          {menu.map((m) => (
            <Pressable
              key={m.key}
              style={styles.item}
              onPress={() => {
                if (m.key === "profile") navigation.navigate("Account");
                else if (m.key === "wallet") navigation.navigate("Wallet");
                else if (m.key === "orders") navigation.navigate("Orders");
                else if (m.key === "subscriptions") navigation.navigate("Subscriptions");
                else if (m.key === "support") navigation.navigate("Support");
                else toast(`${m.title} — coming soon.`);
              }}
            >
              <View style={[styles.itemIcon, { backgroundColor: m.tint }]}>
                <Ionicons name={m.icon} size={20} color={m.fg} />
              </View>
              <View style={styles.itemText}>
                <Text style={styles.itemTitle}>{m.title}</Text>
                <Text style={styles.itemSub} numberOfLines={1}>
                  {m.subtitle}
                </Text>
              </View>
              {m.badge ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{m.badge}</Text>
                </View>
              ) : null}
              {m.key === "wallet" && wallet ? (
                <Text style={styles.value}>₹{Number(wallet.balance).toFixed(2)}</Text>
              ) : m.value ? (
                <Text style={styles.value}>{m.value}</Text>
              ) : null}
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          ))}

          {/* Rider stats — shown only for delivery partners. */}
          {isRider
            ? RIDER_STATS.map((s) => (
                <View key={s.key} style={styles.item}>
                  <View style={[styles.itemIcon, { backgroundColor: s.tint }]}>
                    <Ionicons name={s.icon} size={20} color={s.fg} />
                  </View>
                  <View style={styles.itemText}>
                    <Text style={styles.itemTitle}>{s.title}</Text>
                  </View>
                  <Text style={[styles.statValue, { color: s.valueColor }]}>{s.value}</Text>
                </View>
              ))
            : null}

          {/* Logout */}
          <Pressable style={styles.logout} onPress={onLogout}>
            <View style={[styles.itemIcon, { backgroundColor: colors.errorTint }]}>
              <Ionicons name="log-out-outline" size={20} color={colors.error} />
            </View>
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing(3) },

  // Header -------------------------------------------------------------------
  header: {
    backgroundColor: colors.heading,
    borderRadius: 26,
    marginHorizontal: spacing(2.5),
    marginTop: spacing(1),
    paddingHorizontal: spacing(2.5),
    paddingTop: spacing(2.5),
    paddingBottom: spacing(3),
    minHeight: 150,
    overflow: "hidden",
  },
  blob: {
    position: "absolute",
    top: -45,
    right: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  headerTitle: { fontFamily: fonts.bold, fontSize: 22, color: colors.white },
  userRow: { flexDirection: "row", alignItems: "center", marginTop: spacing(2.5) },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: fonts.bold, fontSize: 24, color: colors.white },
  userInfo: { flex: 1, marginLeft: spacing(1.5) },
  userName: { fontFamily: fonts.bold, fontSize: 18, color: colors.white },
  userPhone: { fontFamily: fonts.semibold, fontSize: 14, color: colors.green, marginTop: 2 },
  editBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Menu ---------------------------------------------------------------------
  menu: { paddingHorizontal: spacing(2.5), paddingTop: spacing(2) },
  item: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    padding: spacing(1.5),
    marginBottom: spacing(1.5),
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: { flex: 1, marginLeft: spacing(1.5) },
  itemTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.heading },
  itemSub: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  badge: {
    backgroundColor: colors.greenTint,
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginRight: spacing(0.75),
  },
  badgeText: { fontFamily: fonts.bold, fontSize: 11, color: colors.green },
  value: { fontFamily: fonts.bold, fontSize: 15, color: colors.green, marginRight: spacing(0.75) },
  statValue: { fontFamily: fonts.bold, fontSize: 15 },

  // Logout -------------------------------------------------------------------
  logout: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.errorTint,
    padding: spacing(1.5),
    marginTop: spacing(0.5),
  },
  logoutText: { fontFamily: fonts.bold, fontSize: 15, color: colors.error, marginLeft: spacing(1.5) },
});
