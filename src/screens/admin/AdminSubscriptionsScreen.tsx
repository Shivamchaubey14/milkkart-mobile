import { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Linking, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAdminSubscriptionForecastQuery, useAdminSubscriptionVacationsQuery } from "../../api/baseApi";
import { Screen } from "../../components/Screen";
import { ListSkeleton } from "../../components/Skeleton";
import { colors, fonts, fontsAlt, spacing } from "../../theme";

const money = (n: number | string) => "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayLabel = (d: Date) => d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
const dateLabel = (s: string) => new Date(s + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" });
const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(0, 0, 0, 0); return d; };

export default function AdminSubscriptionsScreen() {
  const navigation = useNavigation();
  const [tab, setTab] = useState<"forecast" | "vacations">("forecast");
  const [date, setDate] = useState<Date>(tomorrow());
  const [showPicker, setShowPicker] = useState(false);
  const dateISO = useMemo(() => iso(date), [date]);

  const forecast = useAdminSubscriptionForecastQuery(dateISO, { refetchOnMountOrArgChange: true });
  const vacations = useAdminSubscriptionVacationsQuery();

  function onPick(e: DateTimePickerEvent, d?: Date) {
    setShowPicker(false);
    if (e.type === "set" && d) { d.setHours(0, 0, 0, 0); setDate(d); }
  }

  const f = forecast.data;

  return (
    <Screen padded={false} style={{ backgroundColor: colors.bgSoft }}>
      <View style={styles.header}>
        <View style={styles.blob} />
        <View style={styles.headerRow}>
          <Pressable style={styles.back} onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="arrow-back" size={20} color={colors.white} />
          </Pressable>
          <Text style={styles.headerTitle}>Subscriptions</Text>
        </View>
        <View style={styles.segment}>
          {(["forecast", "vacations"] as const).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={[styles.segBtn, tab === t && styles.segBtnActive]}>
              <Text style={[styles.segText, tab === t && styles.segTextActive]}>{t === "forecast" ? "Forecast" : "Vacations"}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {tab === "forecast" ? (
        <>
          <View style={styles.dateBar}>
            <Pressable style={styles.dateBtn} onPress={() => setShowPicker(true)}>
              <View style={styles.calIcon}><Ionicons name="calendar-outline" size={14} color={colors.green} /></View>
              <View>
                <Text style={styles.dateCaption}>DELIVERY DAY</Text>
                <Text style={styles.dateValue}>{dayLabel(date)}</Text>
              </View>
              <Ionicons name="chevron-down" size={16} color={colors.muted} style={{ marginLeft: "auto" }} />
            </Pressable>
          </View>
          {showPicker ? (
            <DateTimePicker value={date} mode="date" display={Platform.OS === "ios" ? "inline" : "calendar"} onChange={onPick} />
          ) : null}

          {forecast.isLoading ? (
            <ListSkeleton rows={5} thumb={false} />
          ) : (
            <ScrollView
              contentContainerStyle={styles.body}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={forecast.isFetching} onRefresh={forecast.refetch} tintColor={colors.green} colors={[colors.green]} />}
            >
              <View style={styles.kpiRow}>
                <Kpi value={String(f?.total_units ?? 0)} label="Units" icon="cube-outline" />
                <Kpi value={String(f?.total_stops ?? 0)} label="Stops" icon="location-outline" />
                <Kpi value={money(f?.total_value ?? 0)} label="Value" icon="cash-outline" />
              </View>

              <Text style={styles.section}>BY PRODUCT</Text>
              <View style={styles.card}>
                {(f?.by_sku ?? []).length === 0 ? (
                  <Text style={styles.empty}>No subscription deliveries on this day.</Text>
                ) : (
                  f!.by_sku.map((s, i) => (
                    <View key={s.variant_id} style={[styles.skuRow, i > 0 && styles.skuBorder]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.skuName} numberOfLines={1}>{s.product}</Text>
                        <Text style={styles.skuMeta}>{s.label} · {s.stops} {s.stops === 1 ? "stop" : "stops"}</Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={styles.skuUnits}>{s.units} units</Text>
                        <Text style={styles.skuValue}>{money(s.value)}</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>

              {(f?.stops ?? []).length > 0 ? (
                <>
                  <Text style={styles.section}>ROUTE STOPS ({f!.stops.length})</Text>
                  {f!.stops.map((st, i) => (
                    <View key={i} style={styles.stopCard}>
                      <View style={styles.stopTop}>
                        <Text style={styles.stopName} numberOfLines={1}>{st.customer_name || "Customer"}</Text>
                        {st.preferred_time ? (
                          <View style={styles.timePill}><Ionicons name="time-outline" size={12} color={colors.info} /><Text style={styles.timeText}>{st.preferred_time}</Text></View>
                        ) : null}
                      </View>
                      <Text style={styles.stopItem}>{st.product} ({st.label}) × {st.quantity}</Text>
                      <Text style={styles.stopAddr} numberOfLines={2}>{st.address}</Text>
                      <Pressable style={styles.stopCall} onPress={() => Linking.openURL(`tel:${st.customer_phone}`)}>
                        <Ionicons name="call-outline" size={13} color={colors.green} />
                        <Text style={styles.stopCallText}>{st.customer_phone}</Text>
                      </Pressable>
                    </View>
                  ))}
                </>
              ) : null}
            </ScrollView>
          )}
        </>
      ) : vacations.isLoading ? (
        <ListSkeleton rows={5} thumb={false} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={vacations.isFetching} onRefresh={vacations.refetch} tintColor={colors.green} colors={[colors.green]} />}
        >
          {(vacations.data?.vacations ?? []).length === 0 ? (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyBadge}><Ionicons name="sunny-outline" size={30} color={colors.green} /></View>
              <Text style={styles.emptyTitle}>No one's on vacation</Text>
              <Text style={styles.empty}>Paused-by-date subscriptions show up here.</Text>
            </View>
          ) : (
            vacations.data!.vacations.map((v) => (
              <View key={v.vacation_id} style={styles.vacCard}>
                <View style={styles.stopTop}>
                  <Text style={styles.stopName} numberOfLines={1}>{v.customer_name || "Customer"}</Text>
                  <View style={[styles.vacBadge, v.active ? styles.vacActive : styles.vacUpcoming]}>
                    <Text style={[styles.vacBadgeText, v.active ? styles.vacActiveText : styles.vacUpcomingText]}>
                      {v.active ? "ON VACATION" : "UPCOMING"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.stopItem}>{v.product} ({v.label})</Text>
                <Text style={styles.stopAddr}>{dateLabel(v.start_date)} → {dateLabel(v.end_date)}</Text>
                <Pressable style={styles.stopCall} onPress={() => Linking.openURL(`tel:${v.customer_phone}`)}>
                  <Ionicons name="call-outline" size={13} color={colors.green} />
                  <Text style={styles.stopCallText}>{v.customer_phone}</Text>
                </Pressable>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

function Kpi({ value, label, icon }: { value: string; label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }) {
  return (
    <View style={styles.kpi}>
      <Ionicons name={icon} size={16} color={colors.green} />
      <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.heading, borderRadius: 26, marginHorizontal: spacing(2.5), marginTop: spacing(1),
    paddingHorizontal: spacing(2.5), paddingTop: spacing(2.5), paddingBottom: spacing(2), overflow: "hidden",
  },
  blob: { position: "absolute", top: -45, right: -30, width: 150, height: 150, borderRadius: 75, backgroundColor: "rgba(255,255,255,0.06)" },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing(1.5) },
  back: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: fonts.bold, fontSize: 22, color: colors.white },
  segment: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 12, padding: 4, marginTop: spacing(2) },
  segBtn: { flex: 1, paddingVertical: spacing(1), borderRadius: 9, alignItems: "center" },
  segBtnActive: { backgroundColor: colors.white },
  segText: { fontFamily: fonts.bold, fontSize: 14, color: "rgba(255,255,255,0.8)" },
  segTextActive: { color: colors.heading },

  dateBar: { paddingHorizontal: spacing(2.5), paddingTop: spacing(2) },
  dateBtn: { flexDirection: "row", alignItems: "center", gap: spacing(1), backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingVertical: spacing(1), paddingHorizontal: spacing(1.25) },
  calIcon: { width: 28, height: 28, borderRadius: 9, backgroundColor: colors.greenTint, alignItems: "center", justifyContent: "center" },
  dateCaption: { fontFamily: fontsAlt.extrabold, fontSize: 8, letterSpacing: 0.6, color: colors.muted },
  dateValue: { fontFamily: fonts.bold, fontSize: 14, color: colors.heading, marginTop: 1 },

  body: { paddingHorizontal: spacing(2.5), paddingTop: spacing(2), paddingBottom: spacing(5) },
  kpiRow: { flexDirection: "row", gap: spacing(1.25) },
  kpi: { flex: 1, backgroundColor: colors.bg, borderRadius: 14, borderWidth: 1, borderColor: colors.lineSoft, padding: spacing(1.5), alignItems: "flex-start" },
  kpiValue: { fontFamily: fonts.bold, fontSize: 18, color: colors.heading, marginTop: spacing(0.75) },
  kpiLabel: { fontFamily: fontsAlt.regular, fontSize: 11, color: colors.muted, marginTop: 2 },

  section: { fontFamily: fontsAlt.extrabold, fontSize: 11, letterSpacing: 0.8, color: colors.muted, marginTop: spacing(2.5), marginBottom: spacing(1) },
  card: { backgroundColor: colors.bg, borderRadius: 16, borderWidth: 1, borderColor: colors.lineSoft, paddingHorizontal: spacing(1.75) },
  empty: { fontFamily: fontsAlt.regular, fontSize: 13, color: colors.muted, paddingVertical: spacing(1.5), textAlign: "center" },
  skuRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing(1.5) },
  skuBorder: { borderTopWidth: 1, borderTopColor: colors.lineSoft },
  skuName: { fontFamily: fonts.bold, fontSize: 14, color: colors.heading },
  skuMeta: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  skuUnits: { fontFamily: fonts.bold, fontSize: 14, color: colors.heading },
  skuValue: { fontFamily: fontsAlt.regular, fontSize: 11, color: colors.green, marginTop: 2 },

  stopCard: { backgroundColor: colors.bg, borderRadius: 14, borderWidth: 1, borderColor: colors.lineSoft, padding: spacing(1.5), marginBottom: spacing(1.25), shadowColor: "#1c2b36", shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  vacCard: { backgroundColor: colors.bg, borderRadius: 14, borderWidth: 1, borderColor: colors.lineSoft, padding: spacing(1.5), marginBottom: spacing(1.25), shadowColor: "#1c2b36", shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  stopTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stopName: { flex: 1, fontFamily: fonts.bold, fontSize: 14, color: colors.heading },
  timePill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#e8f2fc", borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8 },
  timeText: { fontFamily: fonts.bold, fontSize: 11, color: colors.info },
  stopItem: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text, marginTop: spacing(0.75) },
  stopAddr: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginTop: 3, lineHeight: 17 },
  stopCall: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: spacing(1) },
  stopCallText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.green },

  vacBadge: { borderRadius: 7, paddingVertical: 3, paddingHorizontal: 8 },
  vacActive: { backgroundColor: colors.greenTint },
  vacUpcoming: { backgroundColor: "#fff4d6" },
  vacBadgeText: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 0.4 },
  vacActiveText: { color: colors.green },
  vacUpcomingText: { color: "#b98421" },

  emptyWrap: { alignItems: "center", paddingTop: spacing(6) },
  emptyBadge: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.greenTint, alignItems: "center", justifyContent: "center", marginBottom: spacing(2) },
  emptyTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.heading },
});
