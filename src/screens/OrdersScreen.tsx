import { useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Screen } from "../components/Screen";
import { useToast } from "../components/Toast";
import { colors, fonts, fontsAlt, spacing } from "../theme";

const money = (n: number) => "₹" + n.toFixed(2);

type Status = "out_for_delivery" | "delivered" | "cancelled";
type OrderRow = {
  id: string;
  status: Status;
  date: string;
  products: string[];
  tints: string[];
  extra: number;
  total: number;
  itemCount: number;
};

// Hardcoded for now — wired to the real orders API later.
const ORDERS: OrderRow[] = [
  {
    id: "a91f02c4",
    status: "out_for_delivery",
    date: "19 Jun, 11:28",
    products: ["Brown Bread", "Sandwich Bread"],
    tints: ["#f6efdf", "#e2ecf9"],
    extra: 0,
    total: 92.9,
    itemCount: 2,
  },
  {
    id: "620b3ab8",
    status: "delivered",
    date: "18 Jun, 19:04",
    products: ["Full Cream Milk", "Paneer"],
    tints: ["#e6f5ec", "#fde2e4"],
    extra: 1,
    total: 113.75,
    itemCount: 3,
  },
  {
    id: "3f7c1d92",
    status: "cancelled",
    date: "15 Jun, 08:46",
    products: ["Curd 500g"],
    tints: ["#e2f3f5"],
    extra: 0,
    total: 40.0,
    itemCount: 1,
  },
];

const STATUS: Record<Status, { label: string; bg: string; fg: string }> = {
  out_for_delivery: { label: "OUT FOR DELIVERY", bg: colors.greenTint, fg: colors.green },
  delivered: { label: "DELIVERED", bg: "#e8f2fc", fg: colors.info },
  cancelled: { label: "CANCELLED", bg: colors.errorTint, fg: colors.error },
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];
function matchesFilter(status: Status, filter: string) {
  if (filter === "all") return true;
  if (filter === "active") return status === "out_for_delivery";
  return status === filter;
}

export default function OrdersScreen() {
  const [filter, setFilter] = useState("all");
  const visible = ORDERS.filter((o) => matchesFilter(o.status, filter));

  return (
    <Screen padded={false}>
      <View style={styles.flex}>
        <View style={styles.header}>
          <View style={styles.blob} />
          <Text style={styles.headerTitle}>My Orders</Text>
          <Text style={styles.headerSub}>{ORDERS.length} orders placed</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filters}
        >
          {FILTERS.map((f) => {
            const active = f.key === filter;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {visible.length === 0 ? (
          <View style={styles.center}>
            <View style={styles.emptyBadge}>
              <Ionicons name="receipt-outline" size={34} color={colors.green} />
            </View>
            <Text style={styles.emptyTitle}>No orders here</Text>
            <Text style={styles.emptySub}>Try a different filter.</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
            {visible.map((o) => (
              <OrderCard key={o.id} order={o} />
            ))}
          </ScrollView>
        )}
      </View>
    </Screen>
  );
}

function OrderCard({ order }: { order: OrderRow }) {
  const toast = useToast();
  const scale = useRef(new Animated.Value(1)).current;
  const s = STATUS[order.status];
  const soon = (what: string) => () => toast(`${what} — coming soon.`);

  return (
    <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
      <Pressable
        onPressIn={() => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, speed: 40, bounciness: 0 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 6 }).start()}
        android_ripple={{ color: "rgba(59,183,126,0.06)" }}
      >
        <View style={styles.cardTop}>
          <View>
            <Text style={styles.orderNo}>Order #{order.id}</Text>
            <Text style={styles.date}>{order.date}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
            <Text style={[styles.statusText, { color: s.fg }]}>{s.label}</Text>
          </View>
        </View>

        <View style={styles.hr} />

        <View style={styles.middle}>
          <View style={styles.thumbs}>
            {order.tints.slice(0, 2).map((t, i) => (
              <View key={i} style={[styles.thumb, { backgroundColor: t, marginLeft: i === 0 ? 0 : -14 }]} />
            ))}
            {order.extra > 0 ? (
              <View style={[styles.thumb, styles.thumbMore, { marginLeft: -14 }]}>
                <Text style={styles.thumbMoreText}>+{order.extra}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.info}>
            <Text style={styles.names} numberOfLines={2}>
              {order.products.join(", ")}
            </Text>
            <Text style={styles.priceItems}>
              {money(order.total)} · {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
            </Text>
          </View>
          {order.status === "cancelled" ? <Text style={styles.refunded}>Refunded</Text> : null}
        </View>

        {order.status === "out_for_delivery" ? (
          <View style={styles.actions}>
            <ActionBtn label="Track Order" variant="outline" onPress={soon("Track Order")} />
            <ActionBtn label="Help" variant="soft" onPress={soon("Help")} />
          </View>
        ) : order.status === "delivered" ? (
          <View style={styles.actions}>
            <ActionBtn label="Reorder" variant="solid" onPress={soon("Reorder")} />
            <ActionBtn label="Rate" variant="soft" onPress={soon("Rate")} />
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

function ActionBtn({
  label,
  variant,
  onPress,
}: {
  label: string;
  variant: "outline" | "soft" | "solid";
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionBtn,
        variant === "outline" && styles.actionOutline,
        variant === "soft" && styles.actionSoft,
        variant === "solid" && styles.actionSolid,
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text
        style={[
          styles.actionText,
          variant === "outline" && { color: colors.green },
          variant === "soft" && { color: colors.heading },
          variant === "solid" && { color: colors.white },
        ]}
      >
        {label}
      </Text>
    </Pressable>
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

  filtersScroll: { flexGrow: 0 },
  filters: { gap: spacing(1), paddingHorizontal: spacing(2.5), paddingTop: spacing(2), paddingBottom: spacing(2) },
  filterChip: {
    paddingHorizontal: spacing(2),
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg,
    height: 36,
    justifyContent: "center",
  },
  filterChipActive: { backgroundColor: colors.green, borderColor: colors.green },
  filterText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.heading },
  filterTextActive: { color: colors.white },

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

  list: { paddingHorizontal: spacing(2.5), paddingTop: spacing(1.5), paddingBottom: spacing(3) },
  card: {
    backgroundColor: colors.bg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    padding: spacing(2),
    marginBottom: spacing(1.5),
    shadowColor: colors.heading,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  orderNo: { fontFamily: fonts.bold, fontSize: 15, color: colors.heading },
  date: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  statusPill: { borderRadius: 8, paddingVertical: 3, paddingHorizontal: 9 },
  statusText: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.4 },
  hr: { height: 1, backgroundColor: colors.lineSoft, marginVertical: spacing(1.5) },

  middle: { flexDirection: "row", alignItems: "center" },
  thumbs: { flexDirection: "row" },
  thumb: { width: 44, height: 44, borderRadius: 10, borderWidth: 2, borderColor: colors.bg },
  thumbMore: { backgroundColor: colors.lineSoft, alignItems: "center", justifyContent: "center" },
  thumbMoreText: { fontFamily: fonts.bold, fontSize: 13, color: colors.heading },
  info: { flex: 1, marginLeft: spacing(1.5) },
  names: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  priceItems: { fontFamily: fonts.bold, fontSize: 15, color: colors.green, marginTop: 3 },
  refunded: { fontFamily: fonts.bold, fontSize: 13, color: colors.green, marginLeft: spacing(1) },

  actions: { flexDirection: "row", gap: spacing(1.25), marginTop: spacing(1.75) },
  actionBtn: { flex: 1, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  actionOutline: { borderWidth: 1.5, borderColor: colors.green, backgroundColor: colors.bg },
  actionSoft: { backgroundColor: colors.bgSoft },
  actionSolid: { backgroundColor: colors.green },
  actionText: { fontFamily: fonts.bold, fontSize: 14 },
});
