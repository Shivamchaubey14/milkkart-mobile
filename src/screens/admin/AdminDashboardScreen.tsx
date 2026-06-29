import { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

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
import { colors, fonts, fontsAlt, spacing } from "../../theme";

const money = (n: number | string) => "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const PRESETS: { key: string; label: string }[] = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "month", label: "This month" },
  { key: "year", label: "This year" },
];

function rangeFor(preset: string) {
  const end = new Date();
  const start = new Date();
  if (preset === "7d") start.setDate(end.getDate() - 6);
  else if (preset === "30d") start.setDate(end.getDate() - 29);
  else if (preset === "month") start.setDate(1);
  else if (preset === "year") { start.setMonth(0, 1); }
  return { start: iso(start), end: iso(end) };
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Placed",
  confirmed: "Confirmed",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};
const STATUS_COLOR: Record<string, string> = {
  pending: "#b98421",
  confirmed: colors.green,
  out_for_delivery: colors.info,
  delivered: "#29a06a",
  cancelled: colors.error,
  returned: "#b46b00",
};

export default function AdminDashboardScreen() {
  const navigation = useNavigation();
  const [preset, setPreset] = useState("30d");
  const range = useMemo(() => rangeFor(preset), [preset]);

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

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <View style={styles.blob} />
        <View style={styles.headerRow}>
          <Pressable style={styles.back} onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="arrow-back" size={20} color={colors.white} />
          </Pressable>
          <Text style={styles.headerTitle}>Dashboard</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presets}>
          {PRESETS.map((p) => {
            const active = preset === p.key;
            return (
              <Text
                key={p.key}
                onPress={() => setPreset(p.key)}
                style={[styles.preset, active && styles.presetActive]}
              >
                {p.label}
              </Text>
            );
          })}
        </ScrollView>
      </View>

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
            <Kpi label="Orders" value={String(sales.data?.orders ?? 0)} icon="receipt-outline" />
            <Kpi label="Revenue" value={money(sales.data?.revenue ?? 0)} icon="cash-outline" />
            <Kpi label="Avg order" value={money(sales.data?.average_order_value ?? 0)} icon="trending-up-outline" />
            <Kpi label="Subscriptions" value={`${subs.data?.active ?? 0}/${subs.data?.total ?? 0}`} icon="repeat-outline" />
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

function Kpi({ label, value, icon }: { label: string; value: string; icon: React.ComponentProps<typeof Ionicons>["name"] }) {
  return (
    <View style={styles.kpi}>
      <Ionicons name={icon} size={18} color={colors.green} />
      <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
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
  headerTitle: { fontFamily: fonts.bold, fontSize: 22, color: colors.white },
  presets: { gap: spacing(1), paddingTop: spacing(2) },
  preset: { fontFamily: fonts.bold, fontSize: 13, color: "rgba(255,255,255,0.75)", paddingVertical: spacing(0.75), paddingHorizontal: spacing(1.75), borderRadius: 999, backgroundColor: "rgba(255,255,255,0.1)", overflow: "hidden" },
  presetActive: { color: colors.heading, backgroundColor: colors.white },

  body: { paddingHorizontal: spacing(2.5), paddingTop: spacing(2), paddingBottom: spacing(5) },

  kpiGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  kpi: { width: "48.5%", backgroundColor: colors.bg, borderRadius: 16, borderWidth: 1, borderColor: colors.lineSoft, padding: spacing(1.75), marginBottom: spacing(1.5) },
  kpiValue: { fontFamily: fonts.bold, fontSize: 20, color: colors.heading, marginTop: spacing(1) },
  kpiLabel: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginTop: 2 },

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
