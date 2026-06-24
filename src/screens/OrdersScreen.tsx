import { useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { OrderSummary, useOrdersQuery } from "../api/baseApi";
import { imageUrl } from "../api/config";
import { Screen } from "../components/Screen";
import { useToast } from "../components/Toast";
import type { ProfileStackParamList } from "../navigation/ProfileStack";
import { colors, fonts, fontsAlt, spacing } from "../theme";

const money = (n: number | string) => "₹" + Number(n).toFixed(2);
const TINTS = ["#f6efdf", "#e2ecf9", "#e6f5ec", "#fde2e4", "#efe6f7", "#e2f3f5"];

const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  pending: { label: "PENDING", bg: "#fff4d6", fg: "#b98421" },
  confirmed: { label: "CONFIRMED", bg: colors.greenTint, fg: colors.green },
  out_for_delivery: { label: "OUT FOR DELIVERY", bg: colors.greenTint, fg: colors.green },
  delivered: { label: "DELIVERED", bg: "#e8f2fc", fg: colors.info },
  cancelled: { label: "CANCELLED", bg: colors.errorTint, fg: colors.error },
};
const statusOf = (s: string) => STATUS[s] ?? { label: s.toUpperCase(), bg: colors.lineSoft, fg: colors.heading };

const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];
const ACTIVE_STATUSES = ["pending", "confirmed", "out_for_delivery"];
function matchesFilter(status: string, filter: string) {
  if (filter === "all") return true;
  if (filter === "active") return ACTIVE_STATUSES.includes(status);
  return status === filter;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  const day = d.getDate();
  const mon = d.toLocaleDateString(undefined, { month: "short" });
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${day} ${mon}, ${time}`;
}

export default function OrdersScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const { data: orders, isLoading, isFetching, refetch } = useOrdersQuery();
  const [filter, setFilter] = useState("all");

  const sorted = [...(orders ?? [])].sort(
    (a, b) => new Date(b.placed_at).getTime() - new Date(a.placed_at).getTime(),
  );
  const visible = sorted.filter((o) => matchesFilter(o.status, filter));

  return (
    <Screen padded={false}>
      <View style={styles.flex}>
        <View style={styles.header}>
          <View style={styles.blob} />
          <Text style={styles.headerTitle}>My Orders</Text>
          <Text style={styles.headerSub}>
            {sorted.length} {sorted.length === 1 ? "order" : "orders"} placed
          </Text>
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

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.green} />
          </View>
        ) : visible.length === 0 ? (
          <View style={styles.center}>
            <View style={styles.emptyBadge}>
              <Ionicons name="receipt-outline" size={34} color={colors.green} />
            </View>
            <Text style={styles.emptyTitle}>{sorted.length ? "No orders here" : "No orders yet"}</Text>
            <Text style={styles.emptySub}>
              {sorted.length ? "Try a different filter." : "Your orders will show up here."}
            </Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.green} colors={[colors.green]} />
            }
          >
            {visible.map((o, i) => (
              <OrderCard
                key={o.id}
                order={o}
                index={i}
                onPress={() => navigation.navigate("OrderDetail", { orderNumber: o.order_number })}
                onTrack={() => navigation.navigate("TrackOrder", { orderNumber: o.order_number })}
              />
            ))}
          </ScrollView>
        )}
      </View>
    </Screen>
  );
}

function OrderCard({
  order,
  index,
  onPress,
  onTrack,
}: {
  order: OrderSummary;
  index: number;
  onPress: () => void;
  onTrack: () => void;
}) {
  const toast = useToast();
  const scale = useRef(new Animated.Value(1)).current;
  const s = statusOf(order.status);
  const soon = (what: string) => () => toast(`${what} — coming soon.`);

  const shown = Math.min(order.item_count, 2);
  const extra = Math.max(0, order.item_count - 2);
  const names = order.item_names?.length ? order.item_names.join(", ") : `${order.item_count} items`;

  return (
    <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, speed: 40, bounciness: 0 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 6 }).start()}
        android_ripple={{ color: "rgba(59,183,126,0.06)" }}
      >
        <View style={styles.cardTop}>
          <View>
            <Text style={styles.orderNo}>Order #{order.order_number.slice(0, 8)}</Text>
            <Text style={styles.date}>{fmtDate(order.placed_at)}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
            <Text style={[styles.statusText, { color: s.fg }]}>{s.label}</Text>
          </View>
        </View>

        <View style={styles.hr} />

        <View style={styles.middle}>
          <View style={styles.thumbs}>
            {Array.from({ length: shown }).map((_, i) => {
              const img = imageUrl(order.item_images?.[i]);
              return (
                <View
                  key={i}
                  style={[styles.thumb, { backgroundColor: TINTS[(index + i) % TINTS.length], marginLeft: i === 0 ? 0 : -14 }]}
                >
                  {img ? <Image source={{ uri: img }} style={styles.thumbImg} resizeMode="contain" /> : null}
                </View>
              );
            })}
            {extra > 0 ? (
              <View style={[styles.thumb, styles.thumbMore, { marginLeft: shown ? -14 : 0 }]}>
                <Text style={styles.thumbMoreText}>+{extra}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.info}>
            <Text style={styles.names} numberOfLines={2}>
              {names}
            </Text>
            <Text style={styles.priceItems}>
              {money(order.total)} · {order.item_count} {order.item_count === 1 ? "item" : "items"}
            </Text>
          </View>
          {order.status === "cancelled" ? <Text style={styles.refunded}>Refunded</Text> : null}
        </View>

        {ACTIVE_STATUSES.includes(order.status) ? (
          <View style={styles.actions}>
            <ActionBtn label="Track Order" variant="outline" onPress={onTrack} />
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
  thumb: { width: 44, height: 44, borderRadius: 10, borderWidth: 2, borderColor: colors.bg, overflow: "hidden" },
  thumbImg: { width: "100%", height: "100%" },
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
