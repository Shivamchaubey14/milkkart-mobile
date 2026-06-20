import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useRoute } from "@react-navigation/native";
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { OrderItemDetail, useOrderDetailQuery } from "../api/baseApi";
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
  out_for_delivery: { label: "ON THE WAY", bg: "#fff4d6", fg: "#b98421" },
  delivered: { label: "DELIVERED", bg: "#e8f2fc", fg: colors.info },
  cancelled: { label: "CANCELLED", bg: colors.errorTint, fg: colors.error },
};
const statusOf = (s: string) => STATUS[s] ?? { label: s.toUpperCase(), bg: colors.lineSoft, fg: colors.heading };

const STEPS = ["Confirmed", "Packed", "On the\nway", "Delivered"];
const STEP_INDEX: Record<string, number> = { pending: 0, confirmed: 1, out_for_delivery: 2, delivered: 3 };

function fmtDate(iso: string) {
  const d = new Date(iso);
  const day = d.getDate();
  const mon = d.toLocaleDateString(undefined, { month: "short" });
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${day} ${mon}, ${time}`;
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export default function OrderDetailScreen() {
  const { orderNumber } = useRoute<RouteProp<ProfileStackParamList, "OrderDetail">>().params;
  const toast = useToast();
  const { data: order, isLoading } = useOrderDetailQuery(orderNumber);

  if (isLoading || !order) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.green} />
        </View>
      </Screen>
    );
  }

  const s = statusOf(order.status);
  const step = STEP_INDEX[order.status] ?? 0;
  const tracking = order.status === "out_for_delivery";
  const rider = order.assignment;

  let etaText = "";
  if (tracking && rider?.rider_lat && rider?.rider_lng && order.destination) {
    const km = haversineKm(
      { lat: Number(rider.rider_lat), lng: Number(rider.rider_lng) },
      { lat: Number(order.destination.lat), lng: Number(order.destination.lng) },
    );
    etaText = `Rider ${km.toFixed(1)} km away · ~${Math.max(5, Math.round(km * 5))} min`;
  }

  return (
    <Screen padded={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.blob} />
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>Order #{order.order_number.slice(0, 8)}</Text>
            <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
              <Text style={[styles.statusText, { color: s.fg }]}>{s.label}</Text>
            </View>
          </View>
          <Text style={styles.placed}>Placed {fmtDate(order.placed_at)}</Text>
        </View>

        <View style={styles.body}>
          {order.status === "cancelled" ? (
            <View style={styles.cancelCard}>
              <Ionicons name="close-circle" size={22} color={colors.error} />
              <Text style={styles.cancelText}>This order was cancelled.</Text>
            </View>
          ) : (
            <>
              {/* Tracking map placeholder */}
              {tracking ? (
                <View style={styles.map}>
                  <View style={styles.route} />
                  <View style={[styles.marker, styles.markerStart]}>
                    <Ionicons name="bicycle" size={14} color={colors.white} />
                  </View>
                  <View style={[styles.marker, styles.markerEnd]}>
                    <Ionicons name="home" size={12} color={colors.white} />
                  </View>
                  <View style={styles.mapPill}>
                    <View style={styles.dot} />
                    <Text style={styles.mapPillText}>{etaText || "Your order is on the way"}</Text>
                  </View>
                </View>
              ) : null}

              {/* Status timeline */}
              <View style={styles.card}>
                <View style={styles.timelineHead}>
                  <Text style={styles.arriving}>
                    {order.status === "delivered" ? "Delivered" : "Arriving soon"}
                  </Text>
                  {tracking ? <Text style={styles.liveTrack}>Live track</Text> : null}
                </View>
                <View style={styles.timeline}>
                  {STEPS.map((label, i) => {
                    const done = i < step;
                    const active = i === step;
                    return (
                      <View key={i} style={styles.timelineStep}>
                        <View style={styles.timelineLineWrap}>
                          {i > 0 ? <View style={[styles.line, i <= step && styles.lineDone]} /> : <View style={styles.line} />}
                          <View style={[styles.node, (done || active) && styles.nodeDone, active && styles.nodeActive]}>
                            {done ? (
                              <Ionicons name="checkmark" size={13} color={colors.white} />
                            ) : (
                              <View style={[styles.nodeInner, active && styles.nodeInnerActive]} />
                            )}
                          </View>
                          {i < STEPS.length - 1 ? (
                            <View style={[styles.line, i < step && styles.lineDone]} />
                          ) : (
                            <View style={styles.line} />
                          )}
                        </View>
                        <Text style={[styles.stepLabel, (done || active) && styles.stepLabelDone]}>{label}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Delivery partner */}
              {rider?.rider_name ? (
                <View style={styles.card}>
                  <View style={styles.partnerRow}>
                    <View style={styles.partnerAvatar}>
                      <Text style={styles.partnerInitial}>{(rider.rider_name[0] || "R").toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.partnerName}>{rider.rider_name}</Text>
                      <Text style={styles.partnerRole}>Delivery partner</Text>
                    </View>
                    <Pressable
                      style={styles.callBtn}
                      onPress={() => Linking.openURL(`tel:${rider.rider_phone}`)}
                    >
                      <Ionicons name="call" size={18} color={colors.green} />
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </>
          )}

          {/* Items */}
          <Text style={styles.secLabel}>ITEMS</Text>
          {order.items.map((it, i) => (
            <ItemRow key={it.id} item={it} tint={TINTS[i % TINTS.length]} />
          ))}

          {/* Address */}
          <Text style={styles.secLabel}>DELIVERY ADDRESS</Text>
          <View style={styles.addrCard}>
            <View style={styles.addrIcon}>
              <Ionicons name="home-outline" size={16} color={colors.green} />
            </View>
            <Text style={styles.addrText}>{order.address_snapshot}</Text>
          </View>

          {/* Bill */}
          <Text style={styles.secLabel}>BILL DETAILS</Text>
          <View style={styles.billCard}>
            <BillRow label="Subtotal" value={money(order.subtotal)} />
            <BillRow label="Delivery & fees" value={money(Number(order.delivery_fee) + Number(order.small_cart_fee))} />
            <BillRow label="Tax" value={money(order.tax)} />
            {Number(order.discount) > 0 ? (
              <BillRow label={`Coupon${order.coupon_code ? ` (${order.coupon_code})` : ""}`} value={"−" + money(order.discount)} green />
            ) : null}
            <View style={styles.billDivider} />
            <BillRow label="Total" value={money(order.total)} strong />
          </View>

          {/* Actions */}
          {order.status !== "cancelled" ? (
            <View style={styles.actions}>
              <Pressable
                style={({ pressed }) => [styles.trackBtn, pressed && { opacity: 0.85 }]}
                onPress={() => toast("Live tracking — coming soon.")}
              >
                <Text style={styles.trackText}>{order.status === "delivered" ? "Reorder" : "Track Order"}</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.helpBtn, pressed && { opacity: 0.7 }]}
                onPress={() => toast("Help — coming soon.")}
              >
                <Text style={styles.helpText}>Help</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

function ItemRow({ item, tint }: { item: OrderItemDetail; tint: string }) {
  const img = imageUrl(item.image_url);
  return (
    <View style={styles.itemCard}>
      <View style={[styles.itemThumb, { backgroundColor: tint }]}>
        {img ? <Image source={{ uri: img }} style={styles.itemImg} resizeMode="contain" /> : null}
      </View>
      <View style={{ flex: 1, marginLeft: spacing(1.5) }}>
        <Text style={styles.itemName} numberOfLines={1}>
          {item.product_name}
        </Text>
        <Text style={styles.itemMeta}>
          {item.variant_label} · Qty {item.quantity}
        </Text>
      </View>
      <Text style={styles.itemPrice}>{money(item.subtotal)}</Text>
    </View>
  );
}

function BillRow({ label, value, strong, green }: { label: string; value: string; strong?: boolean; green?: boolean }) {
  return (
    <View style={styles.billRow}>
      <Text style={[styles.billLabel, strong && styles.billStrong]}>{label}</Text>
      <Text style={[styles.billValue, strong && styles.billStrong, (green || strong) && { color: colors.green }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { paddingBottom: spacing(4) },

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
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { fontFamily: fonts.bold, fontSize: 20, color: colors.white, flex: 1 },
  statusPill: { borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10 },
  statusText: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.4 },
  placed: { fontFamily: fontsAlt.regular, fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: spacing(0.75) },

  body: { paddingHorizontal: spacing(2.5), paddingTop: spacing(2) },

  // Map placeholder
  map: {
    height: 150,
    borderRadius: 16,
    backgroundColor: "#e6efe9",
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  route: {
    position: "absolute",
    top: 40,
    left: 50,
    width: 200,
    height: 60,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: colors.green,
    borderStyle: "dashed",
    borderTopLeftRadius: 40,
  },
  marker: { position: "absolute", width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.white },
  markerStart: { top: 28, left: 38, backgroundColor: colors.green },
  markerEnd: { top: 86, right: 36, backgroundColor: colors.heading },
  mapPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    margin: spacing(1.5),
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.green },
  mapPillText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.heading },

  card: {
    backgroundColor: colors.bg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    padding: spacing(2),
    marginTop: spacing(1.5),
  },
  cancelCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1),
    backgroundColor: colors.errorTint,
    borderRadius: 14,
    padding: spacing(1.75),
  },
  cancelText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.error },

  // Timeline
  timelineHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing(2) },
  arriving: { fontFamily: fonts.bold, fontSize: 16, color: colors.heading },
  liveTrack: { fontFamily: fonts.bold, fontSize: 13, color: colors.green },
  timeline: { flexDirection: "row" },
  timelineStep: { flex: 1, alignItems: "center" },
  timelineLineWrap: { flexDirection: "row", alignItems: "center", width: "100%", justifyContent: "center" },
  line: { flex: 1, height: 2, backgroundColor: colors.line },
  lineDone: { backgroundColor: colors.green },
  node: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.lineSoft, alignItems: "center", justifyContent: "center" },
  nodeDone: { backgroundColor: colors.green },
  nodeActive: { backgroundColor: colors.green },
  nodeInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.muted },
  nodeInnerActive: { backgroundColor: colors.white },
  stepLabel: { fontFamily: fontsAlt.regular, fontSize: 11, color: colors.muted, marginTop: 6, textAlign: "center" },
  stepLabelDone: { color: colors.heading, fontFamily: fonts.semibold },

  // Partner
  partnerRow: { flexDirection: "row", alignItems: "center" },
  partnerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.heading, alignItems: "center", justifyContent: "center" },
  partnerInitial: { fontFamily: fonts.bold, fontSize: 18, color: colors.white },
  partnerName: { fontFamily: fonts.bold, fontSize: 15, color: colors.heading, marginLeft: spacing(1.5) },
  partnerRole: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginLeft: spacing(1.5), marginTop: 1 },
  callBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.greenTint, alignItems: "center", justifyContent: "center" },

  secLabel: { fontFamily: fontsAlt.extrabold, fontSize: 11, letterSpacing: 1, color: colors.muted, marginTop: spacing(3), marginBottom: spacing(1) },

  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    padding: spacing(1.25),
    marginBottom: spacing(1.25),
  },
  itemThumb: { width: 48, height: 48, borderRadius: 10, overflow: "hidden" },
  itemImg: { width: "100%", height: "100%" },
  itemName: { fontFamily: fonts.bold, fontSize: 14, color: colors.heading },
  itemMeta: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  itemPrice: { fontFamily: fonts.bold, fontSize: 14, color: colors.green },

  addrCard: { flexDirection: "row", gap: spacing(1.25), alignItems: "center", backgroundColor: colors.bg, borderRadius: 14, borderWidth: 1, borderColor: colors.lineSoft, padding: spacing(1.75) },
  addrIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.greenTint, alignItems: "center", justifyContent: "center" },
  addrText: { flex: 1, fontFamily: fontsAlt.regular, fontSize: 13, color: colors.text, lineHeight: 19 },

  billCard: { backgroundColor: colors.bgSoft, borderRadius: 14, padding: spacing(1.75) },
  billRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing(0.5) },
  billLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.heading },
  billValue: { fontFamily: fonts.semibold, fontSize: 14, color: colors.heading },
  billStrong: { fontFamily: fonts.bold, fontSize: 16 },
  billDivider: { height: 1, backgroundColor: colors.line, marginVertical: spacing(1) },

  actions: { flexDirection: "row", gap: spacing(1.25), marginTop: spacing(2.5) },
  trackBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.green, alignItems: "center", justifyContent: "center" },
  trackText: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },
  helpBtn: { width: 110, height: 52, borderRadius: 14, backgroundColor: colors.bgSoft, alignItems: "center", justifyContent: "center" },
  helpText: { fontFamily: fonts.bold, fontSize: 16, color: colors.heading },
});
