import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import { OrderSummary, useOrdersQuery } from "../api/baseApi";
import { Screen } from "../components/Screen";
import { colors, fonts, fontsAlt, spacing } from "../theme";

const money = (n: number | string) => "₹" + Number(n).toFixed(2);

const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  pending: { label: "Pending", bg: "#fff4d6", fg: "#b98421" },
  confirmed: { label: "Confirmed", bg: colors.greenTint, fg: colors.green },
  out_for_delivery: { label: "Out for delivery", bg: "#e8f2fc", fg: colors.info },
  delivered: { label: "Delivered", bg: colors.greenTint, fg: colors.green },
  cancelled: { label: "Cancelled", bg: colors.errorTint, fg: colors.error },
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  const day = d.getDate();
  const mon = d.toLocaleDateString(undefined, { month: "short" });
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${day} ${mon}, ${time}`;
}

export default function OrdersScreen() {
  const { data: orders, isLoading } = useOrdersQuery();
  // Newest first (the API returns them in insertion order).
  const sorted = [...(orders ?? [])].sort(
    (a, b) => new Date(b.placed_at).getTime() - new Date(a.placed_at).getTime(),
  );

  return (
    <Screen padded={false}>
      <View style={styles.flex}>
        <View style={styles.header}>
          <View style={styles.blob} />
          <Text style={styles.headerTitle}>My Orders</Text>
          <Text style={styles.headerSub}>Track & reorder</Text>
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.green} />
          </View>
        ) : sorted.length === 0 ? (
          <View style={styles.center}>
            <View style={styles.emptyBadge}>
              <Ionicons name="receipt-outline" size={34} color={colors.green} />
            </View>
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptySub}>Your orders will show up here.</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
            {sorted.map((o) => (
              <OrderCard key={o.id} order={o} />
            ))}
          </ScrollView>
        )}
      </View>
    </Screen>
  );
}

function OrderCard({ order }: { order: OrderSummary }) {
  const s = STATUS[order.status] ?? { label: order.status, bg: colors.lineSoft, fg: colors.heading };
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.orderNo}>Order #{order.order_number.slice(0, 8)}</Text>
        <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
          <Text style={[styles.statusText, { color: s.fg }]}>{s.label}</Text>
        </View>
      </View>
      <Text style={styles.date}>{fmtDate(order.placed_at)}</Text>
      <View style={styles.hr} />
      <View style={styles.cardBottom}>
        <Text style={styles.items}>
          {order.item_count} {order.item_count === 1 ? "item" : "items"}
        </Text>
        <Text style={styles.total}>{money(order.total)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

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
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  headerTitle: { fontFamily: fonts.bold, fontSize: 22, color: colors.white },
  headerSub: { fontFamily: fontsAlt.regular, fontSize: 13, color: colors.green, marginTop: 3 },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },
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
  emptySub: { fontFamily: fontsAlt.regular, fontSize: 14, color: colors.muted, marginTop: spacing(0.5) },

  list: { paddingHorizontal: spacing(2.5), paddingTop: spacing(2), paddingBottom: spacing(3) },
  card: {
    backgroundColor: colors.bg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    padding: spacing(2),
    marginBottom: spacing(1.5),
  },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  orderNo: { fontFamily: fonts.bold, fontSize: 15, color: colors.heading },
  statusPill: { borderRadius: 8, paddingVertical: 3, paddingHorizontal: 9 },
  statusText: { fontFamily: fonts.bold, fontSize: 11 },
  date: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginTop: 4 },
  hr: { height: 1, backgroundColor: colors.lineSoft, marginVertical: spacing(1.5) },
  cardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  items: { fontFamily: fontsAlt.regular, fontSize: 13, color: colors.text },
  total: { fontFamily: fonts.bold, fontSize: 16, color: colors.green },
});
