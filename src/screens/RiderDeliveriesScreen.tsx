import { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Image,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { RiderDelivery, useRiderDeliveriesQuery } from "../api/baseApi";
import { imageUrl } from "../api/config";
import { OrderItemsModal } from "../components/OrderItemsModal";
import { Screen } from "../components/Screen";
import { ListSkeleton } from "../components/Skeleton";
import { useT } from "../i18n/LanguageProvider";
import type { TKey } from "../i18n/translations";
import type { RiderHomeStackParamList } from "../navigation/RiderHomeStack";
import { colors, fonts, fontsAlt, spacing } from "../theme";

const money = (n: number | string) => "₹" + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const TINTS = ["#e2ecf9", "#e6f5ec", "#fde2e4", "#f6efdf", "#efe6f7", "#e2f3f5"];

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
const dateISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// "Today" / "Yesterday" / "Saturday, 27 Jun 2026" for a YYYY-MM-DD key.
function dayHeading(key: string, t: (k: TKey) => string) {
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (key === dateISO(today)) return t("today");
  if (key === dateISO(yest)) return t("yesterday");
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return `${DAYS[dt.getDay()]}, ${d} ${MONTHS[m - 1]} ${y}`;
}

function timeText(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  let h = d.getHours();
  const min = pad(d.getMinutes());
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${min} ${ampm}`;
}

// "YYYY-MM-DD" → "30 Jun" for the next-day delivery pill.
const shortDay = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" });

const STATUS_PILL: Record<string, { key: TKey; bg: string; fg: string }> = {
  delivered: { key: "statusDelivered", bg: colors.greenTint, fg: colors.green },
  returned: { key: "statusReturned", bg: colors.errorTint, fg: colors.error },
  assigned: { key: "statusNew", bg: "#fff4d6", fg: "#b98421" },
  accepted: { key: "statusAccepted", bg: "#fff4d6", fg: "#b98421" },
  picked_up: { key: "statusOutForDelivery", bg: "#fff4d6", fg: "#b98421" },
};

const KIND_TITLE: Record<string, TKey> = {
  delivered: "delivered",
  pending: "pending",
  returned: "returned",
};

export default function RiderDeliveriesScreen() {
  const { kind } = useRoute<RouteProp<RiderHomeStackParamList, "RiderDeliveries">>().params;
  const navigation = useNavigation<NativeStackNavigationProp<RiderHomeStackParamList>>();
  const t = useT();
  // Poll so status changes / new assignments surface within ~20s without a pull.
  const { data, isLoading, isFetching, refetch } = useRiderDeliveriesQuery(kind, {
    pollingInterval: 20000,
  });
  const [openFor, setOpenFor] = useState<RiderDelivery | null>(null);

  // Group the flat (already newest-first) list into date sections.
  const sections = useMemo(() => {
    const out: { title: string; key: string; data: RiderDelivery[] }[] = [];
    for (const d of data?.deliveries ?? []) {
      const key = d.date ?? "—";
      const last = out[out.length - 1];
      if (last && last.key === key) last.data.push(d);
      else out.push({ key, title: dayHeading(key, t), data: [d] });
    }
    return out;
  }, [data, t]);

  const total = data?.deliveries.length ?? 0;

  return (
    <Screen padded={false}>
      {/* Header */}
      <View style={styles.header}>
        {navigation.canGoBack() ? (
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={colors.heading} />
          </Pressable>
        ) : null}
        <View style={styles.flex}>
          <Text style={styles.title}>{t(KIND_TITLE[kind])}</Text>
          {!isLoading ? (
            <Text style={styles.subtitle}>
              {total} {total === 1 ? t("orderLabel") : t("ordersLabel")}
            </Text>
          ) : null}
        </View>
      </View>

      {isLoading ? (
        <ListSkeleton rows={6} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.order_number}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.green} colors={[colors.green]} />
          }
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionCount}>{section.data.length}</Text>
            </View>
          )}
          renderItem={({ item }) => <DeliveryCard d={item} onPress={() => setOpenFor(item)} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="cube-outline" size={36} color={colors.muted} />
              <Text style={styles.emptyText}>{t("noOrdersYet")}</Text>
            </View>
          }
        />
      )}

      <OrderItemsModal delivery={openFor} onClose={() => setOpenFor(null)} />
    </Screen>
  );
}

function DeliveryCard({ d, onPress }: { d: RiderDelivery; onPress: () => void }) {
  const t = useT();
  const img = imageUrl(d.item_images?.[0]);
  const pill = STATUS_PILL[d.status];
  const name = d.customer_name || d.address;
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]} onPress={onPress}>
      <View style={[styles.thumb, { backgroundColor: TINTS[0] }]}>
        {img ? <Image source={{ uri: img }} style={styles.thumbImg} resizeMode="contain" /> : null}
        {d.item_count > 1 ? (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{d.item_count}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={styles.cardName} numberOfLines={1}>{name}</Text>
          <Text style={styles.cardAmount}>{money(d.total)}</Text>
        </View>
        <Text style={styles.cardAddr} numberOfLines={1}>
          #{d.order_number.slice(0, 8)} · {d.address}
        </Text>
        <View style={styles.cardMeta}>
          {pill ? (
            <View style={[styles.pill, { backgroundColor: pill.bg }]}>
              <Text style={[styles.pillText, { color: pill.fg }]}>{t(pill.key)}</Text>
            </View>
          ) : null}
          <View style={[styles.payPill, d.is_cod ? styles.payCod : styles.payPrepaid]}>
            <Text style={[styles.payText, d.is_cod ? styles.payTextCod : styles.payTextPrepaid]}>
              {d.is_cod ? t("codShort") : t("prepaidShort")}
            </Text>
          </View>
          {d.delivery_type === "next_day" ? (
            <View style={[styles.payPill, styles.nextDayPill]}>
              <Text style={[styles.payText, styles.nextDayPillText]}>
                {d.delivery_date ? `NEXT-DAY ${shortDay(d.delivery_date)}` : "NEXT-DAY"}
              </Text>
            </View>
          ) : null}
          {d.at ? <Text style={styles.cardTime}>{timeText(d.at)}</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: spacing(6), gap: spacing(1.5) },
  emptyText: { fontFamily: fontsAlt.regular, fontSize: 14, color: colors.muted },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.5),
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(1.5),
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgSoft, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.bold, fontSize: 20, color: colors.heading },
  subtitle: { fontFamily: fontsAlt.regular, fontSize: 13, color: colors.muted, marginTop: 1 },

  listContent: { paddingHorizontal: spacing(2.5), paddingBottom: spacing(4) },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing(2),
    marginBottom: spacing(1),
  },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.heading },
  sectionCount: { fontFamily: fontsAlt.extrabold, fontSize: 12, color: colors.muted },

  card: {
    flexDirection: "row",
    gap: spacing(1.5),
    backgroundColor: colors.bg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    padding: spacing(1.5),
    marginBottom: spacing(1.25),
  },
  thumb: { width: 52, height: 52, borderRadius: 12, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  thumbImg: { width: "100%", height: "100%" },
  countBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.heading,
    alignItems: "center",
    justifyContent: "center",
  },
  countBadgeText: { fontFamily: fonts.bold, fontSize: 10, color: colors.white },

  cardBody: { flex: 1, justifyContent: "center" },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing(1) },
  cardName: { flex: 1, fontFamily: fonts.bold, fontSize: 15, color: colors.heading },
  cardAmount: { fontFamily: fonts.bold, fontSize: 15, color: colors.heading },
  cardAddr: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: spacing(0.75), marginTop: spacing(1) },
  pill: { borderRadius: 7, paddingVertical: 3, paddingHorizontal: 8 },
  pillText: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 0.4 },
  payPill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 },
  payCod: { backgroundColor: "#fff4d6" },
  payPrepaid: { backgroundColor: colors.greenTint },
  payText: { fontFamily: fontsAlt.extrabold, fontSize: 9, letterSpacing: 0.5 },
  payTextCod: { color: "#b98421" },
  payTextPrepaid: { color: colors.green },
  nextDayPill: { backgroundColor: "#e8f2fc" },
  nextDayPillText: { color: colors.info },
  cardTime: { marginLeft: "auto", fontFamily: fontsAlt.regular, fontSize: 11, color: colors.muted },
});
