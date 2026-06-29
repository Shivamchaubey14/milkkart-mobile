import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { RiderEarningsProduct, useRiderEarningsQuery } from "../api/baseApi";
import { imageUrl } from "../api/config";
import { Screen } from "../components/Screen";
import { useT } from "../i18n/LanguageProvider";
import type { TKey } from "../i18n/translations";
import type { RiderHomeStackParamList } from "../navigation/RiderHomeStack";
import { colors, fonts, fontsAlt, spacing } from "../theme";

const money = (n: number | string) => "₹" + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const TINTS = ["#e2ecf9", "#e6f5ec", "#fde2e4", "#f6efdf", "#efe6f7", "#e2f3f5"];
const DOW = ["S", "M", "T", "W", "T", "F", "S"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const CHART_H = 132;

const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
const dateISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmtDay = (d: Date) => `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

// "Today" / "Yesterday" / "Sat, 27 Jun 2026" for a Date.
function relDay(d: Date, t: (k: TKey) => string) {
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (dateISO(d) === dateISO(today)) return t("today");
  if (dateISO(d) === dateISO(yest)) return t("yesterday");
  return fmtDay(d);
}

export default function RiderEarningsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RiderHomeStackParamList>>();
  const t = useT();
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const { data, isLoading, isFetching, refetch } = useRiderEarningsQuery(dateISO(date));

  const daily = data?.daily ?? [];
  const maxEarn = Math.max(1, ...daily.map((d) => Number(d.earnings)));
  const byProduct = data?.by_product ?? [];
  const maxProduct = Math.max(1, ...byProduct.map((p) => Number(p.earnings)));
  const selectedISO = data?.date ?? dateISO(date);

  const onPickDate = (event: DateTimePickerEvent, picked?: Date) => {
    setShowPicker(false);
    if (event.type === "set" && picked) setDate(picked);
  };

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        {navigation.canGoBack() ? (
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={colors.heading} />
          </Pressable>
        ) : null}
        <Text style={styles.title}>{t("earnings")}</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.green} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.green} colors={[colors.green]} />
          }
        >
          {/* Hero — all-time total */}
          <View style={styles.hero}>
            <View style={styles.heroBlob} />
            <Text style={styles.heroLabel}>{t("totalEarnings")}</Text>
            <Text style={styles.heroAmount}>{money(data?.total_earnings ?? 0)}</Text>
            <View style={styles.heroMetaRow}>
              <View style={styles.heroChip}>
                <Ionicons name="cube-outline" size={13} color={colors.white} />
                <Text style={styles.heroChipText}>
                  {data?.total_deliveries ?? 0} {t("delivered")}
                </Text>
              </View>
              <View style={styles.heroChip}>
                <Ionicons name="pricetag-outline" size={13} color={colors.white} />
                <Text style={styles.heroChipText}>
                  {money(data?.fee_per_delivery ?? 0)} / {t("orderLabel").toLowerCase()}
                </Text>
              </View>
            </View>
          </View>

          {/* Date picker + selected-day earnings */}
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>{t("dayWiseEarnings")}</Text>
            <Pressable style={styles.datePick} onPress={() => setShowPicker(true)} hitSlop={6}>
              <Ionicons name="calendar-outline" size={15} color={colors.green} />
              <Text style={styles.datePickText}>{relDay(date, t)}</Text>
            </Pressable>
          </View>
          {showPicker ? (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === "ios" ? "inline" : "calendar"}
              maximumDate={new Date()}
              onChange={onPickDate}
            />
          ) : null}
          <View style={styles.dayCard}>
            <View style={styles.dayCol}>
              <Text style={styles.dayLabel}>{t("earnings")}</Text>
              <Text style={styles.dayAmount}>{money(data?.selected.earnings ?? 0)}</Text>
            </View>
            <View style={styles.dayDivider} />
            <View style={styles.dayCol}>
              <Text style={styles.dayLabel}>{t("delivered")}</Text>
              <Text style={styles.dayDeliveries}>{data?.selected.deliveries ?? 0}</Text>
            </View>
          </View>

          {/* Daily chart — tap a bar to inspect that day */}
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>{t("last14Days")}</Text>
          </View>
          <View style={styles.chartCard}>
            <View style={styles.chart}>
              {daily.map((d) => {
                const v = Number(d.earnings);
                const h = Math.max(v > 0 ? 4 : 2, (v / maxEarn) * CHART_H);
                const dow = new Date(d.date + "T00:00:00").getDay();
                const sel = d.date === selectedISO;
                return (
                  <Pressable key={d.date} style={styles.barCol} onPress={() => setDate(new Date(d.date + "T00:00:00"))} hitSlop={4}>
                    {sel && v > 0 ? <Text style={styles.barValue}>{money(v).replace(".00", "")}</Text> : null}
                    <View style={styles.barTrack}>
                      <View style={[styles.bar, { height: h, backgroundColor: sel ? colors.green : colors.greenTint }]} />
                    </View>
                    <Text style={[styles.barLabel, sel && styles.barLabelSel]}>{DOW[dow]}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Earnings by product — for the selected day */}
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>{t("earningsByProduct")}</Text>
            <Text style={styles.sectionMeta}>{relDay(date, t)}</Text>
          </View>
          {byProduct.length ? (
            <View style={styles.productCard}>
              {byProduct.map((p, i) => (
                <ProductRow key={p.product_name} p={p} pct={Number(p.earnings) / maxProduct} tint={TINTS[i % TINTS.length]} />
              ))}
              <Text style={styles.attrNote}>{t("earningsAttributionNote")}</Text>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="cube-outline" size={28} color={colors.muted} />
              <Text style={styles.emptyText}>{t("noEarningsThatDay")}</Text>
            </View>
          )}

          {/* Link to the delivered list */}
          <Pressable
            style={({ pressed }) => [styles.deliveredBtn, pressed && { opacity: 0.85 }]}
            onPress={() => navigation.navigate("RiderDeliveries", { kind: "delivered" })}
          >
            <Ionicons name="list-outline" size={18} color={colors.green} />
            <Text style={styles.deliveredBtnText}>{t("viewDeliveredOrders")}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.green} />
          </Pressable>
        </ScrollView>
      )}
    </Screen>
  );
}

function ProductRow({ p, pct, tint }: { p: RiderEarningsProduct; pct: number; tint: string }) {
  const t = useT();
  const img = imageUrl(p.image_url);
  return (
    <View style={styles.prodRow}>
      <View style={[styles.prodThumb, { backgroundColor: tint }]}>
        {img ? <Image source={{ uri: img }} style={styles.prodThumbImg} resizeMode="contain" /> : null}
      </View>
      <View style={styles.prodInfo}>
        <View style={styles.prodTop}>
          <Text style={styles.prodName} numberOfLines={1}>{p.product_name}</Text>
          <Text style={styles.prodEarn}>{money(p.earnings)}</Text>
        </View>
        <View style={styles.prodBarTrack}>
          <View style={[styles.prodBar, { width: `${Math.max(4, Math.round(pct * 100))}%` }]} />
        </View>
        <Text style={styles.prodMeta}>
          {p.deliveries} {p.deliveries === 1 ? t("orderLabel").toLowerCase() : t("ordersLabel")} · {t("qtyLabel")} {p.qty}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: spacing(6) },
  scroll: { paddingHorizontal: spacing(2.5), paddingBottom: spacing(4) },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.5),
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(1.5),
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgSoft, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.bold, fontSize: 20, color: colors.heading },

  // Hero
  hero: { backgroundColor: colors.heading, borderRadius: 22, padding: spacing(2.5), overflow: "hidden" },
  heroBlob: { position: "absolute", top: -45, right: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: "rgba(255,255,255,0.05)" },
  heroLabel: { fontFamily: fontsAlt.extrabold, fontSize: 11, letterSpacing: 1, color: "rgba(255,255,255,0.55)" },
  heroAmount: { fontFamily: fonts.bold, fontSize: 34, color: colors.yellow, marginTop: spacing(0.75) },
  heroMetaRow: { flexDirection: "row", gap: spacing(1), marginTop: spacing(1.75) },
  heroChip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 999, paddingVertical: 6, paddingHorizontal: 11 },
  heroChipText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.white },

  // Section headers
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing(3), marginBottom: spacing(1.25) },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.heading },
  sectionMeta: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted },
  datePick: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.greenTint, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 11 },
  datePickText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.green },

  // Selected day card
  dayCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.green, borderRadius: 16, padding: spacing(2) },
  dayCol: { flex: 1 },
  dayDivider: { width: 1, alignSelf: "stretch", backgroundColor: "rgba(255,255,255,0.25)", marginHorizontal: spacing(1.5) },
  dayLabel: { fontFamily: fontsAlt.regular, fontSize: 12, color: "rgba(255,255,255,0.8)" },
  dayAmount: { fontFamily: fonts.bold, fontSize: 26, color: colors.white, marginTop: 3 },
  dayDeliveries: { fontFamily: fonts.bold, fontSize: 26, color: colors.white, marginTop: 3 },

  // Chart
  chartCard: { backgroundColor: colors.bg, borderRadius: 16, borderWidth: 1, borderColor: colors.lineSoft, padding: spacing(1.75), paddingTop: spacing(2.5) },
  chart: { flexDirection: "row", alignItems: "flex-end", height: CHART_H + 36, gap: 3 },
  barCol: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  barValue: { fontFamily: fonts.bold, fontSize: 9, color: colors.green, marginBottom: 3 },
  barTrack: { height: CHART_H, justifyContent: "flex-end", width: "100%", alignItems: "center" },
  bar: { width: "78%", borderRadius: 5, minHeight: 2 },
  barLabel: { fontFamily: fontsAlt.regular, fontSize: 9, color: colors.muted, marginTop: 6 },
  barLabelSel: { fontFamily: fonts.bold, color: colors.green },

  // Product breakdown
  productCard: { backgroundColor: colors.bg, borderRadius: 16, borderWidth: 1, borderColor: colors.lineSoft, padding: spacing(1.75), gap: spacing(1.75) },
  prodRow: { flexDirection: "row", alignItems: "center", gap: spacing(1.25) },
  prodThumb: { width: 42, height: 42, borderRadius: 11, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  prodThumbImg: { width: "100%", height: "100%" },
  prodInfo: { flex: 1 },
  prodTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing(1) },
  prodName: { flex: 1, fontFamily: fonts.semibold, fontSize: 14, color: colors.heading },
  prodEarn: { fontFamily: fonts.bold, fontSize: 14, color: colors.green },
  prodBarTrack: { height: 6, borderRadius: 3, backgroundColor: colors.lineSoft, marginTop: 6, overflow: "hidden" },
  prodBar: { height: 6, borderRadius: 3, backgroundColor: colors.green },
  prodMeta: { fontFamily: fontsAlt.regular, fontSize: 11, color: colors.muted, marginTop: 5 },
  attrNote: { fontFamily: fontsAlt.regular, fontSize: 11, color: colors.muted, fontStyle: "italic", marginTop: spacing(0.5) },

  emptyCard: { backgroundColor: colors.bgSoft, borderRadius: 16, padding: spacing(3), alignItems: "center", gap: spacing(1) },
  emptyText: { fontFamily: fontsAlt.regular, fontSize: 14, color: colors.muted },

  deliveredBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.green,
    marginTop: spacing(2.5),
  },
  deliveredBtnText: { fontFamily: fonts.bold, fontSize: 15, color: colors.green },
});
