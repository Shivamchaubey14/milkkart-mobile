import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { useRiderDeliveriesQuery, useRiderEarningsQuery, useUpdateMeMutation, useWalletQuery } from "../api/baseApi";
import { Screen } from "../components/Screen";
import { useToast } from "../components/Toast";
import { useT } from "../i18n/LanguageProvider";
import type { TKey } from "../i18n/translations";
import type { ProfileStackParamList } from "../navigation/ProfileStack";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { logout, setUser } from "../store/authSlice";
import { clearTokens } from "../store/secureTokens";
import { colors, fonts, fontsAlt, spacing } from "../theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

type MenuItem = {
  key: string;
  icon: IoniconName;
  tint: string;
  fg: string;
  titleKey: TKey;
  subKey: TKey;
  badgeKey?: TKey;
};

const MENU: MenuItem[] = [
  { key: "profile", icon: "location-outline", tint: colors.greenTint, fg: colors.green, titleKey: "menuProfileTitle", subKey: "menuProfileSub" },
  { key: "orders", icon: "receipt-outline", tint: "#fff4d6", fg: "#b98421", titleKey: "menuOrdersTitle", subKey: "menuOrdersSub" },
  { key: "subscriptions", icon: "repeat-outline", tint: colors.greenTint, fg: colors.green, titleKey: "menuSubsTitle", subKey: "menuSubsSub", badgeKey: "subsActiveBadge" },
  { key: "wallet", icon: "card-outline", tint: colors.lineSoft, fg: colors.heading, titleKey: "menuWalletTitle", subKey: "menuWalletSub" },
  { key: "support", icon: "help-circle-outline", tint: colors.lineSoft, fg: colors.heading, titleKey: "menuSupportTitle", subKey: "menuSupportSub" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const money = (n: number | string) => "₹" + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

export default function ProfileScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  const toast = useToast();
  const t = useT();
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const isRider = !!user?.is_rider;
  // Riders see stat rows, not the wallet/orders menu — skip the wallet fetch.
  const { data: wallet, isFetching, refetch } = useWalletQuery(undefined, { skip: isRider });
  // Rider stats come from the same endpoints as the home dashboard / earnings.
  const { data: earnings } = useRiderEarningsQuery(undefined, { skip: !isRider });
  const { data: pendingList } = useRiderDeliveriesQuery("pending", { skip: !isRider });
  const [updateMe, { isLoading: uploadingAvatar }] = useUpdateMeMutation();
  const menu = isRider ? MENU.filter((m) => m.key === "profile") : MENU;

  const initial = (user?.name?.trim()?.[0] || "U").toUpperCase();

  // "Pending since" = the day the oldest still-active order was assigned (the
  // list is newest-first, so the last row is the oldest).
  const pendingDeliveries = pendingList?.deliveries ?? [];
  const pendingSince = (() => {
    const oldest = pendingDeliveries[pendingDeliveries.length - 1];
    if (!oldest?.date) return "—";
    const [, m, d] = oldest.date.split("-").map(Number);
    return `${d} ${MONTHS[m - 1]}`;
  })();

  type StatRow = { key: string; icon: IoniconName; tint: string; fg: string; title: string; value: string; valueColor: string; onPress?: () => void };
  const riderStats: StatRow[] = [
    { key: "delivered", icon: "checkmark-done-outline", tint: colors.greenTint, fg: colors.green, title: t("totalDelivered"), value: String(earnings?.total_deliveries ?? 0), valueColor: colors.heading, onPress: () => navigation.navigate("RiderDeliveries", { kind: "delivered" }) },
    { key: "pending", icon: "time-outline", tint: "#fff4d6", fg: "#b98421", title: t("totalPendingStat"), value: String(pendingDeliveries.length), valueColor: colors.heading, onPress: () => navigation.navigate("RiderDeliveries", { kind: "pending" }) },
    { key: "earnings", icon: "cash-outline", tint: colors.greenTint, fg: colors.green, title: t("totalEarnings"), value: money(earnings?.total_earnings ?? 0), valueColor: colors.green, onPress: () => navigation.navigate("RiderEarnings") },
    { key: "pendingSince", icon: "calendar-outline", tint: colors.lineSoft, fg: colors.heading, title: t("totalPendingSince"), value: pendingSince, valueColor: colors.muted },
  ];

  // Pick a photo from the library, compress to a data URL and save it as the
  // profile picture (PATCH /auth/me/), then reflect it in the store.
  async function pickAvatar() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        toast(t("avatarPermNeeded"), "info");
        return;
      }
      const r = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.4,
        base64: true,
      });
      if (r.canceled || !r.assets[0]?.base64) return;
      const dataUrl = `data:image/jpeg;base64,${r.assets[0].base64}`;
      const updated = await updateMe({ avatar: dataUrl }).unwrap();
      dispatch(setUser(updated));
      toast(t("avatarUpdated"));
    } catch (e) {
      toast(t("avatarFailed"), "error");
    }
  }

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
          <Text style={styles.headerTitle}>{t("profileTitle")}</Text>

          <View style={styles.userRow}>
            <Pressable style={styles.avatar} onPress={pickAvatar} disabled={uploadingAvatar}>
              {uploadingAvatar ? (
                <ActivityIndicator color={colors.white} />
              ) : user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarText}>{initial}</Text>
              )}
              <View style={styles.avatarBadge}>
                <Ionicons name="camera" size={12} color={colors.white} />
              </View>
            </Pressable>
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={2}>
                {user?.name || t("milkkartUser")}
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
                else toast(t("comingSoon"));
              }}
            >
              <View style={[styles.itemIcon, { backgroundColor: m.tint }]}>
                <Ionicons name={m.icon} size={20} color={m.fg} />
              </View>
              <View style={styles.itemText}>
                <Text style={styles.itemTitle}>{t(m.titleKey)}</Text>
                <Text style={styles.itemSub} numberOfLines={1}>
                  {t(m.subKey)}
                </Text>
              </View>
              {m.badgeKey ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{t(m.badgeKey)}</Text>
                </View>
              ) : null}
              {m.key === "wallet" && wallet ? (
                <Text style={styles.value}>₹{Number(wallet.balance).toFixed(2)}</Text>
              ) : null}
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          ))}

          {/* Rider stats — shown only for delivery partners. Delivered/Pending/
              Earnings rows are tappable and open their detail screens. */}
          {isRider
            ? riderStats.map((s) => {
                const Row: any = s.onPress ? Pressable : View;
                return (
                  <Row key={s.key} style={styles.item} onPress={s.onPress}>
                    <View style={[styles.itemIcon, { backgroundColor: s.tint }]}>
                      <Ionicons name={s.icon} size={20} color={s.fg} />
                    </View>
                    <View style={styles.itemText}>
                      <Text style={styles.itemTitle}>{s.title}</Text>
                    </View>
                    <Text style={[styles.statValue, { color: s.valueColor }]}>{s.value}</Text>
                    {s.onPress ? (
                      <Ionicons name="chevron-forward" size={18} color={colors.muted} style={{ marginLeft: spacing(0.75) }} />
                    ) : null}
                  </Row>
                );
              })
            : null}

          {/* Logout */}
          <Pressable style={styles.logout} onPress={onLogout}>
            <View style={[styles.itemIcon, { backgroundColor: colors.errorTint }]}>
              <Ionicons name="log-out-outline" size={20} color={colors.error} />
            </View>
            <Text style={styles.logoutText}>{t("logout")}</Text>
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
  avatarImg: { width: 56, height: 56, borderRadius: 28 },
  avatarBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.green,
    borderWidth: 2,
    borderColor: colors.heading,
    alignItems: "center",
    justifyContent: "center",
  },
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
