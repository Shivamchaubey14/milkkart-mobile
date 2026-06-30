import { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  useAdminOrderStatusQuery,
  useAdminRiderReportQuery,
  useAdminSalesQuery,
  useAdminSubscriptionReportQuery,
  useAdminTopProductsQuery,
} from "../../api/baseApi";
import { AnimatedBar, DonutChart } from "../../components/Charts";
import { Screen } from "../../components/Screen";
import { ListSkeleton } from "../../components/Skeleton";
import { useToast } from "../../components/Toast";
import { colors, fonts, fontsAlt, spacing } from "../../theme";
import { shareCsv } from "./exportCsv";

const money = (n: number | string) => "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayLabel = (d: Date) => d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const monthStart = () => { const d = today(); d.setDate(1); return d; };

const STATUS_LABEL: Record<string, string> = {
  pending: "Placed",
  confirmed: "Confirmed",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};
// Same palette the web dashboard uses for the orders-by-status doughnut.
const STATUS_COLOR: Record<string, string> = {
  pending: "#3f8dfd",
  confirmed: "#fdc040",
  out_for_delivery: "#3bb77e",
  delivered: "#29a06a",
  cancelled: "#d23f3f",
  returned: "#b46b00",
};

export default function AdminDashboardScreen() {
  const navigation = useNavigation();
  const toast = useToast();
  // Default to this month → today; editable via the From/To calendar buttons.
  const [start, setStart] = useState<Date>(monthStart());
  const [end, setEnd] = useState<Date>(today());
  const [picker, setPicker] = useState<"start" | "end" | null>(null);
  const range = useMemo(() => ({ start: iso(start), end: iso(end) }), [start, end]);

  function onPick(e: DateTimePickerEvent, d?: Date) {
    const which = picker;
    setPicker(null);
    if (e.type !== "set" || !d) return;
    const picked = new Date(d);
    picked.setHours(0, 0, 0, 0);
    if (which === "start") {
      setStart(picked);
      if (iso(picked) > iso(end)) setEnd(picked);
    } else if (which === "end") {
      setEnd(picked);
      if (iso(picked) < iso(start)) setStart(picked);
    }
  }

  const sales = useAdminSalesQuery(range);
  const status = useAdminOrderStatusQuery(range);
  const top = useAdminTopProductsQuery(range);
  const subs = useAdminSubscriptionReportQuery(range);
  const riders = useAdminRiderReportQuery(range);

  const loading = sales.isLoading || status.isLoading || top.isLoading;
  const fetching = sales.isFetching || status.isFetching || top.isFetching || subs.isFetching || riders.isFetching;
  const refetchAll = () => {
    sales.refetch(); status.refetch(); top.refetch(); subs.refetch(); riders.refetch();
  };

  const statusRows = Object.entries(status.data ?? {}).sort((a, b) => b[1] - a[1]);
  const statusTotal = statusRows.reduce((sum, [, v]) => sum + v, 0);
  const statusSegments = statusRows.map(([k, v]) => ({
    value: v,
    color: STATUS_COLOR[k] || colors.green,
    label: STATUS_LABEL[k] || k,
  }));
  const topMax = Math.max(1, ...(top.data ?? []).map((t) => t.quantity));

  async function onExport() {
    const rows: (string | number)[][] = [
      ["MilkKart Dashboard", `${range.start} to ${range.end}`],
      [],
      ["Metric", "Value"],
      ["Orders", sales.data?.orders ?? 0],
      ["Revenue", sales.data?.revenue ?? "0"],
      ["Avg order value", sales.data?.average_order_value ?? "0"],
      [],
      ["Orders by status", "Orders"],
      ...statusRows.map(([k, v]) => [STATUS_LABEL[k] || k, v]),
      [],
      ["Top products", "Units", "Revenue"],
      ...(top.data ?? []).map((t) => [t.product_name, t.quantity, t.revenue]),
      [],
      ["Subscriptions", "Value"],
      ["Active", subs.data?.active ?? 0],
      ["Paused", subs.data?.paused ?? 0],
      ["Cancelled", subs.data?.cancelled ?? 0],
      ["New in period", subs.data?.new_in_period ?? 0],
      ["Cancelled in period", subs.data?.cancelled_in_period ?? 0],
      [],
      ["Rider", "Delivered", "Assignments", "Avg rating"],
      ...(riders.data ?? []).map((r) => [r.rider, r.delivered, r.assignments, r.avg_rider_rating ?? ""]),
    ];
    try {
      await shareCsv(`dashboard-${range.start}_to_${range.end}.csv`, rows);
    } catch {
      toast("Couldn't export the CSV.", "error");
    }
  }

  return (
    <Screen padded={false} style={{ backgroundColor: colors.bgSoft }}>
      <View style={styles.header}>
        <View style={styles.blob} />
        <View style={styles.headerRow}>
          <Pressable style={styles.back} onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="arrow-back" size={20} color={colors.white} />
          </Pressable>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <Pressable style={styles.exportBtn} onPress={onExport} hitSlop={8}>
            <Ionicons name="download-outline" size={15} color={colors.green} />
            <Text style={styles.exportText}>CSV</Text>
          </Pressable>
        </View>
      </View>

      {/* Date filter — From/To rounded calendar buttons (same as Orders). */}
      <View style={styles.dateBar}>
        <Pressable style={styles.dateBtn} onPress={() => setPicker("start")}>
          <View style={styles.calIcon}>
            <Ionicons name="calendar-outline" size={13} color={colors.green} />
          </View>
          <View style={styles.dateText}>
            <Text style={styles.dateCaption}>FROM</Text>
            <Text style={styles.dateValue} numberOfLines={1}>{dayLabel(start)}</Text>
          </View>
        </Pressable>
        <Pressable style={styles.dateBtn} onPress={() => setPicker("end")}>
          <View style={styles.calIcon}>
            <Ionicons name="calendar-outline" size={13} color={colors.green} />
          </View>
          <View style={styles.dateText}>
            <Text style={styles.dateCaption}>TO</Text>
            <Text style={styles.dateValue} numberOfLines={1}>{dayLabel(end)}</Text>
          </View>
        </Pressable>
      </View>

      {picker ? (
        <DateTimePicker
          value={picker === "start" ? start : end}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "calendar"}
          maximumDate={today()}
          onChange={onPick}
        />
      ) : null}

      {loading ? (
        <ListSkeleton rows={5} thumb={false} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={fetching} onRefresh={refetchAll} tintColor={colors.green} colors={[colors.green]} />}
        >
          {/* KPI cards */}
          <View style={styles.kpiGrid}>
            <Kpi label="Orders" value={String(sales.data?.orders ?? 0)} icon="receipt-outline" tint={colors.greenTint} fg={colors.green} />
            <Kpi label="Revenue" value={money(sales.data?.revenue ?? 0)} icon="cash-outline" tint="#fff4d6" fg="#b98421" />
            <Kpi label="Avg order" value={money(sales.data?.average_order_value ?? 0)} icon="trending-up-outline" tint="#e8f2fc" fg={colors.info} />
            <Kpi label="Subscriptions" value={`${subs.data?.active ?? 0}/${subs.data?.total ?? 0}`} icon="repeat-outline" tint="#efe6f7" fg="#7c5cd6" />
          </View>

          {/* Orders by status */}
          <Text style={styles.sectionTitle}>Orders by status</Text>
          <View style={styles.card}>
            {statusRows.length === 0 ? (
              <Text style={styles.empty}>No orders in this range.</Text>
            ) : (
              <DonutChart segments={statusSegments} centerValue={String(statusTotal)} centerLabel="orders" />
            )}
          </View>

          {/* Top products */}
          <Text style={styles.sectionTitle}>Top products</Text>
          <View style={styles.card}>
            {(top.data ?? []).length === 0 ? (
              <Text style={styles.empty}>No sales in this range.</Text>
            ) : (
              top.data!.map((t, i) => (
                <View key={i} style={styles.prodRow}>
                  <View style={styles.rank}><Text style={styles.rankText}>{i + 1}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.prodName} numberOfLines={1}>{t.product_name}</Text>
                    <View style={{ marginTop: 5 }}>
                      <AnimatedBar pct={(t.quantity / topMax) * 100} delay={i * 80} />
                    </View>
                  </View>
                  <View style={styles.prodMeta}>
                    <Text style={styles.prodUnits}>{t.quantity} units</Text>
                    <Text style={styles.prodRevenue}>{money(t.revenue)}</Text>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Subscriptions breakdown */}
          <Text style={styles.sectionTitle}>Subscriptions</Text>
          <View style={styles.card}>
            <Metric label="Active" value={subs.data?.active ?? 0} />
            <Metric label="Paused" value={subs.data?.paused ?? 0} />
            <Metric label="Cancelled" value={subs.data?.cancelled ?? 0} />
            <Metric label="New in period" value={subs.data?.new_in_period ?? 0} />
            <Metric label="Cancelled in period" value={subs.data?.cancelled_in_period ?? 0} last />
          </View>

          {/* Rider performance */}
          <Text style={styles.sectionTitle}>Rider performance</Text>
          <View style={styles.card}>
            {(riders.data ?? []).length === 0 ? (
              <Text style={styles.empty}>No rider activity in this range.</Text>
            ) : (
              riders.data!.map((r, i) => (
                <View key={i} style={[styles.riderRow, i > 0 && styles.riderBorder]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.riderPhone}>{r.rider}</Text>
                    <Text style={styles.riderMeta}>{r.delivered}/{r.assignments} delivered</Text>
                  </View>
                  {r.avg_rider_rating != null ? (
                    <View style={styles.ratingPill}>
                      <Ionicons name="star" size={12} color={colors.rating} />
                      <Text style={styles.ratingText}>{r.avg_rider_rating.toFixed(1)}</Text>
                    </View>
                  ) : null}
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

function Kpi({
  label,
  value,
  icon,
  tint,
  fg,
}: {
  label: string;
  value: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  tint: string;
  fg: string;
}) {
  return (
    <View style={[styles.kpi, { backgroundColor: tint }]}>
      <View style={styles.kpiIcon}>
        <Ionicons name={icon} size={16} color={fg} />
      </View>
      <Text style={[styles.kpiValue, { color: fg }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
        {value}
      </Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function Metric({ label, value, last }: { label: string; value: number; last?: boolean }) {
  return (
    <View style={[styles.metricRow, !last && styles.metricBorder]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
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
  headerTitle: { flex: 1, fontFamily: fonts.bold, fontSize: 22, color: colors.white },
  exportBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: colors.white, borderRadius: 10, paddingVertical: spacing(0.75), paddingHorizontal: spacing(1.25) },
  exportText: { fontFamily: fonts.bold, fontSize: 13, color: colors.green },

  // Date filter — compact rounded-square calendar buttons (matches Orders)
  dateBar: { flexDirection: "row", alignItems: "stretch", gap: spacing(0.75), paddingHorizontal: spacing(2.5), paddingTop: spacing(2) },
  dateBtn: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing(0.75), backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingVertical: spacing(0.75), paddingHorizontal: spacing(1) },
  calIcon: { width: 24, height: 24, borderRadius: 8, backgroundColor: colors.greenTint, alignItems: "center", justifyContent: "center" },
  dateText: { flex: 1, minWidth: 0 },
  dateCaption: { fontFamily: fontsAlt.extrabold, fontSize: 8, letterSpacing: 0.6, color: colors.muted },
  dateValue: { fontFamily: fonts.bold, fontSize: 12, color: colors.heading, marginTop: 1 },

  body: { paddingHorizontal: spacing(2.5), paddingTop: spacing(2), paddingBottom: spacing(5) },

  kpiGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  kpi: { width: "48.5%", borderRadius: 16, padding: spacing(1.75), marginBottom: spacing(1.5), shadowColor: "#1c2b36", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  kpiIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", marginBottom: spacing(1.25) },
  kpiValue: { alignSelf: "stretch", fontFamily: fonts.bold, fontSize: 20 },
  kpiLabel: { fontFamily: fonts.semibold, fontSize: 12, color: colors.heading, marginTop: 3 },

  sectionTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.heading, marginTop: spacing(2), marginBottom: spacing(1.25) },
  card: { backgroundColor: colors.bg, borderRadius: 16, borderWidth: 1, borderColor: colors.lineSoft, padding: spacing(1.75) },
  empty: { fontFamily: fontsAlt.regular, fontSize: 13, color: colors.muted },

  prodRow: { flexDirection: "row", alignItems: "center", gap: spacing(1.25), paddingVertical: spacing(1) },
  rank: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.greenTint, alignItems: "center", justifyContent: "center" },
  rankText: { fontFamily: fonts.bold, fontSize: 12, color: colors.green },
  prodName: { fontFamily: fonts.semibold, fontSize: 13, color: colors.heading },
  prodMeta: { alignItems: "flex-end" },
  prodUnits: { fontFamily: fonts.bold, fontSize: 13, color: colors.heading },
  prodRevenue: { fontFamily: fontsAlt.regular, fontSize: 11, color: colors.muted, marginTop: 2 },

  metricRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing(1.25) },
  metricBorder: { borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  metricLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.heading },
  metricValue: { fontFamily: fonts.bold, fontSize: 15, color: colors.green },

  riderRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing(1.25) },
  riderBorder: { borderTopWidth: 1, borderTopColor: colors.lineSoft },
  riderPhone: { fontFamily: fonts.bold, fontSize: 14, color: colors.heading },
  riderMeta: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  ratingPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.yellowTint, borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8 },
  ratingText: { fontFamily: fonts.bold, fontSize: 12, color: "#b98421" },
});
