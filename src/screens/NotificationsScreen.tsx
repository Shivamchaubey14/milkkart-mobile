import { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  AppNotification,
  NotificationPreferences,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationPreferencesQuery,
  useNotificationsQuery,
  useUpdateNotificationPreferencesMutation,
} from "../api/baseApi";
import { Screen } from "../components/Screen";
import { useT } from "../i18n/LanguageProvider";
import type { TKey } from "../i18n/translations";
import { colors, fonts, fontsAlt, spacing } from "../theme";

type PrefKey = keyof Omit<NotificationPreferences, "updated_at">;
const CHANNELS: { key: PrefKey; labelKey: TKey; subKey: TKey }[] = [
  { key: "push_enabled", labelKey: "prefPush", subKey: "prefPushSub" },
  { key: "sms_enabled", labelKey: "prefSms", subKey: "prefSmsSub" },
  { key: "email_enabled", labelKey: "prefEmail", subKey: "prefEmailSub" },
];
const CATEGORIES: { key: PrefKey; labelKey: TKey; subKey: TKey }[] = [
  { key: "order_updates", labelKey: "prefOrderUpdates", subKey: "prefOrderUpdatesSub" },
  { key: "subscription_reminders", labelKey: "prefSubReminders", subKey: "prefSubRemindersSub" },
  { key: "promotions", labelKey: "prefPromos", subKey: "prefPromosSub" },
];

const CATEGORY: Record<
  string,
  { icon: React.ComponentProps<typeof Ionicons>["name"]; bg: string; fg: string }
> = {
  order: { icon: "cube", bg: colors.greenTint, fg: colors.green },
  promo: { icon: "pricetag", bg: colors.yellowTint, fg: "#b98421" },
  subscription: { icon: "repeat", bg: colors.infoTint, fg: colors.info },
  system: { icon: "notifications", bg: colors.lineSoft, fg: colors.heading },
};

type Translate = ReturnType<typeof useT>;

function timeAgo(iso: string, t: Translate) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return t("justNow");
  if (m < 60) return t("minutesAgo", { n: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t("hoursAgo", { n: h });
  const d = Math.floor(h / 24);
  if (d < 7) return t("daysAgo", { n: d });
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const t = useT();
  const { data: items, isLoading, isFetching, refetch } = useNotificationsQuery();
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead, { isLoading: markingAll }] = useMarkAllNotificationsReadMutation();

  const [settingsOpen, setSettingsOpen] = useState(false);

  const list = items ?? [];
  const unread = list.filter((n) => !n.is_read).length;

  function onPressItem(n: AppNotification) {
    if (!n.is_read) markRead(n.id);
    // Best-effort deep link: order notifications open the order in the Profile tab.
    const orderNumber = n.data?.order_number;
    if (n.category === "order" && typeof orderNumber === "string") {
      navigation.navigate("Profile", { screen: "OrderDetail", params: { orderNumber } });
    } else if (n.category === "subscription") {
      navigation.navigate("Profile", { screen: "Subscriptions" });
    }
  }

  return (
    <Screen padded={false}>
      <View style={styles.flex}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.blob} />
          <Text style={styles.headerTitle}>{t("notifications")}</Text>
          <Text style={styles.headerSub}>
            {unread > 0 ? t("unreadCount", { n: unread }) : t("allCaughtUp")}
          </Text>
        </View>

        {/* Actions — below the card, right-aligned. */}
        <View style={styles.actionsRow}>
          {unread > 0 ? (
            <Pressable style={styles.markAll} onPress={() => markAllRead()} disabled={markingAll}>
              {markingAll ? (
                <ActivityIndicator size="small" color={colors.green} />
              ) : (
                <Text style={styles.markAllText}>{t("markAllRead")}</Text>
              )}
            </Pressable>
          ) : null}
          <Pressable style={styles.gear} onPress={() => setSettingsOpen(true)} hitSlop={6}>
            <Ionicons name="settings-outline" size={18} color={colors.green} />
          </Pressable>
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.green} />
          </View>
        ) : list.length === 0 ? (
          <View style={styles.center}>
            <View style={styles.emptyBadge}>
              <Ionicons name="notifications-outline" size={34} color={colors.green} />
            </View>
            <Text style={styles.emptyTitle}>{t("noNotifications")}</Text>
            <Text style={styles.emptySub}>{t("notificationsEmptySub")}</Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.green} />
            }
          >
            {list.map((n) => {
              const c = CATEGORY[n.category] ?? CATEGORY.system;
              return (
                <Pressable
                  key={n.id}
                  style={({ pressed }) => [styles.item, !n.is_read && styles.itemUnread, pressed && { opacity: 0.85 }]}
                  onPress={() => onPressItem(n)}
                >
                  <View style={[styles.itemIcon, { backgroundColor: c.bg }]}>
                    <Ionicons name={c.icon} size={18} color={c.fg} />
                  </View>
                  <View style={styles.itemBody}>
                    <View style={styles.itemTop}>
                      <Text style={styles.itemTitle} numberOfLines={1}>
                        {n.title}
                      </Text>
                      <Text style={styles.itemTime}>{timeAgo(n.created_at, t)}</Text>
                    </View>
                    {n.body ? (
                      <Text style={styles.itemText} numberOfLines={2}>
                        {n.body}
                      </Text>
                    ) : null}
                  </View>
                  {!n.is_read ? <View style={styles.dot} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <SettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </View>
    </Screen>
  );
}

function SettingsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const t = useT();
  const { data: prefs, isLoading } = useNotificationPreferencesQuery();
  const [updatePrefs] = useUpdateNotificationPreferencesMutation();

  const translateY = useRef(new Animated.Value(700)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(backdrop, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 170 }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(backdrop, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 700, duration: 220, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!mounted) return null;

  const row = (item: { key: PrefKey; labelKey: TKey; subKey: TKey }) => (
    <View key={item.key} style={styles.prefRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.prefLabel}>{t(item.labelKey)}</Text>
        <Text style={styles.prefSub}>{t(item.subKey)}</Text>
      </View>
      <Switch
        value={!!prefs?.[item.key]}
        onValueChange={(v) => {
          updatePrefs({ [item.key]: v });
        }}
        trackColor={{ false: colors.line, true: colors.green }}
        thumbColor={colors.white}
        ios_backgroundColor={colors.line}
      />
    </View>
  );

  return (
    <Modal transparent visible={mounted} animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[styles.sheet, { transform: [{ translateY }], paddingBottom: insets.bottom + spacing(2) }]}>
        <View style={styles.handle} />
        <View style={styles.sheetHead}>
          <Text style={styles.sheetTitle}>{t("notificationSettings")}</Text>
          <Pressable style={styles.sheetClose} onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={18} color={colors.heading} />
          </Pressable>
        </View>

        {isLoading || !prefs ? (
          <ActivityIndicator color={colors.green} style={{ marginVertical: spacing(3) }} />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            <Text style={styles.prefGroup}>{t("channels")}</Text>
            <View style={styles.prefCard}>{CHANNELS.map(row)}</View>

            <Text style={styles.prefGroup}>{t("whatYouGet")}</Text>
            <View style={styles.prefCard}>{CATEGORIES.map(row)}</View>

            <Text style={styles.prefFoot}>{t("changesSaveAuto")}</Text>
          </ScrollView>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing(4) },

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
  blob: {
    position: "absolute",
    top: -45,
    right: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(59,183,126,0.18)",
  },
  headerTitle: { fontFamily: fonts.bold, fontSize: 22, color: colors.white },
  headerSub: { fontFamily: fontsAlt.regular, fontSize: 13, color: colors.green, marginTop: 3 },

  // Actions below the header card, right-aligned.
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing(1),
    marginHorizontal: spacing(2.5),
    marginTop: spacing(1.5),
  },
  markAll: {
    backgroundColor: colors.greenTint,
    borderRadius: 999,
    paddingVertical: spacing(0.75),
    paddingHorizontal: spacing(1.5),
  },
  markAllText: { fontFamily: fonts.bold, fontSize: 12, color: colors.green },
  gear: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.bg,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },

  list: { paddingHorizontal: spacing(2.5), paddingTop: spacing(2), paddingBottom: spacing(3) },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.5),
    backgroundColor: colors.bg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    padding: spacing(1.75),
    marginBottom: spacing(1.25),
  },
  itemUnread: { backgroundColor: colors.greenTint, borderColor: "transparent" },
  itemIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  itemBody: { flex: 1 },
  itemTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing(1) },
  itemTitle: { flex: 1, fontFamily: fonts.bold, fontSize: 14, color: colors.heading },
  itemTime: { fontFamily: fontsAlt.regular, fontSize: 11, color: colors.muted },
  itemText: { fontFamily: fontsAlt.regular, fontSize: 13, color: colors.text, lineHeight: 18, marginTop: 3 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.green },

  emptyBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.greenTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing(2),
  },
  emptyTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.heading },
  emptySub: { fontFamily: fontsAlt.regular, fontSize: 14, color: colors.muted, marginTop: spacing(0.5), textAlign: "center" },

  // Settings bottom sheet
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(37,61,78,0.5)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "82%",
    backgroundColor: colors.bg,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: spacing(2.5),
    paddingTop: spacing(1.25),
  },
  handle: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: spacing(1.5) },
  sheetHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing(1) },
  sheetTitle: { fontFamily: fonts.bold, fontSize: 19, color: colors.heading },
  sheetClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgSoft, alignItems: "center", justifyContent: "center" },

  prefGroup: { fontFamily: fontsAlt.extrabold, fontSize: 11, letterSpacing: 1, color: colors.muted, marginTop: spacing(2), marginBottom: spacing(1) },
  prefCard: {
    backgroundColor: colors.bg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    paddingHorizontal: spacing(1.75),
  },
  prefRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing(1.5),
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  prefLabel: { fontFamily: fonts.bold, fontSize: 15, color: colors.heading },
  prefSub: { fontFamily: fontsAlt.regular, fontSize: 12.5, color: colors.muted, marginTop: 1 },
  prefFoot: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, textAlign: "center", marginTop: spacing(2) },
});
