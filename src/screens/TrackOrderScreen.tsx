import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  Dimensions,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useOrderDetailQuery } from "../api/baseApi";
import { Screen } from "../components/Screen";
import TrackingMap from "../components/TrackingMap";
import type { ProfileStackParamList } from "../navigation/ProfileStack";
import { colors, fonts, fontsAlt, spacing } from "../theme";

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

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

const MAP_HEIGHT = Math.round(Dimensions.get("window").height * 0.48);

export default function TrackOrderScreen() {
  const { orderNumber } = useRoute<RouteProp<ProfileStackParamList, "TrackOrder">>().params;
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const insets = useSafeAreaInsets();
  // Poll so the rider's position and status refresh while we watch.
  const { data: order, isLoading } = useOrderDetailQuery(orderNumber, { pollingInterval: 10000 });
  const [eta, setEta] = useState("");

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

  const riderGeo =
    rider?.rider_lat && rider?.rider_lng
      ? { lat: Number(rider.rider_lat), lng: Number(rider.rider_lng) }
      : null;
  const destGeo = order.destination
    ? { lat: Number(order.destination.lat), lng: Number(order.destination.lng) }
    : null;
  const showMap = tracking && !!riderGeo && !!destGeo;

  // Straight-line ETA until the map reports an along-route figure.
  let initialEta = "Your order is on the way";
  if (showMap) {
    const km = haversineKm(riderGeo!, destGeo!);
    initialEta = `Arriving in ~${Math.max(1, Math.round((km / 18) * 60))} min · ${
      km < 1 ? Math.round(km * 1000) + " m" : km.toFixed(1) + " km"
    } away`;
  }

  const title =
    order.status === "delivered"
      ? "Order delivered"
      : order.status === "cancelled"
        ? "Order cancelled"
        : tracking
          ? "Arriving soon"
          : "Preparing your order";

  return (
    <View style={styles.flex}>
      {/* Map (or a tinted placeholder when not yet out for delivery). */}
      <View style={[styles.mapArea, { height: MAP_HEIGHT }]}>
        {showMap ? (
          <TrackingMap fill rider={riderGeo!} destination={destGeo!} onEta={setEta} />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons
              name={order.status === "delivered" ? "checkmark-done-circle" : "bicycle"}
              size={46}
              color={colors.green}
            />
            <Text style={styles.placeholderText}>
              {order.status === "delivered"
                ? "This order has been delivered."
                : order.status === "cancelled"
                  ? "This order was cancelled."
                  : "Live tracking starts once your order is out for delivery."}
            </Text>
          </View>
        )}

        {/* Back button. */}
        <Pressable
          style={[styles.backBtn, { top: insets.top + spacing(1) }]}
          onPress={() => navigation.goBack()}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={22} color={colors.heading} />
        </Pressable>

        {/* Live ETA pill over the map. */}
        {showMap ? (
          <View style={styles.etaPill} pointerEvents="none">
            <View style={styles.etaDot} />
            <Text style={styles.etaText} numberOfLines={1}>
              {eta || initialEta}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Sheet — overlaps the map with a rounded top. */}
      <View style={styles.sheet}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: spacing(2.5), paddingBottom: insets.bottom + spacing(3) }}
        >
          <View style={styles.grabber} />

          <View style={styles.sheetHead}>
            <View style={styles.flex}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.orderNo}>Order #{order.order_number.slice(0, 8)}</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
              <Text style={[styles.statusText, { color: s.fg }]}>{s.label}</Text>
            </View>
          </View>

          {/* Status timeline. */}
          <View style={styles.timeline}>
            {STEPS.map((label, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <View key={i} style={styles.timelineStep}>
                  <View style={styles.timelineLineWrap}>
                    <View style={[styles.line, i <= step && i > 0 && styles.lineDone]} />
                    <View style={[styles.node, (done || active) && styles.nodeDone]}>
                      {done ? (
                        <Ionicons name="checkmark" size={13} color={colors.white} />
                      ) : (
                        <View style={[styles.nodeInner, active && styles.nodeInnerActive]} />
                      )}
                    </View>
                    <View style={[styles.line, i < step && styles.lineDone]} />
                  </View>
                  <Text style={[styles.stepLabel, (done || active) && styles.stepLabelDone]}>{label}</Text>
                </View>
              );
            })}
          </View>

          {/* Delivery partner. */}
          {rider?.rider_name ? (
            <View style={styles.partnerCard}>
              <View style={styles.partnerAvatar}>
                <Text style={styles.partnerInitial}>{(rider.rider_name[0] || "R").toUpperCase()}</Text>
              </View>
              <View style={styles.flex}>
                <Text style={styles.partnerName}>{rider.rider_name}</Text>
                <Text style={styles.partnerRole}>
                  Delivery partner{rider.vehicle_number ? ` · ${rider.vehicle_number}` : ""}
                </Text>
              </View>
              <Pressable style={styles.callBtn} onPress={() => Linking.openURL(`tel:${rider.rider_phone}`)}>
                <Ionicons name="call" size={18} color={colors.green} />
              </Pressable>
            </View>
          ) : null}

          {/* Delivery address. */}
          <View style={styles.addrCard}>
            <View style={styles.addrIcon}>
              <Ionicons name="location-outline" size={16} color={colors.green} />
            </View>
            <Text style={styles.addrText}>{order.address_snapshot}</Text>
          </View>

          <Pressable
            style={({ pressed }) => [styles.detailsBtn, pressed && { opacity: 0.85 }]}
            onPress={() => navigation.navigate("OrderDetail", { orderNumber: order.order_number })}
          >
            <Text style={styles.detailsText}>View full order details</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.green} />
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  mapArea: { backgroundColor: "#e6efe9" },
  placeholder: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing(4), gap: spacing(1.5) },
  placeholderText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.heading,
    textAlign: "center",
    lineHeight: 21,
  },

  backBtn: {
    position: "absolute",
    left: spacing(2),
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  etaPill: {
    position: "absolute",
    left: spacing(2),
    right: spacing(2),
    bottom: spacing(3.5),
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  etaDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green },
  etaText: { flex: 1, fontFamily: fonts.bold, fontSize: 13, color: colors.heading },

  // Sheet
  sheet: {
    flex: 1,
    marginTop: -spacing(3),
    backgroundColor: colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  grabber: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    marginBottom: spacing(2),
  },
  sheetHead: { flexDirection: "row", alignItems: "flex-start", marginBottom: spacing(2.5) },
  title: { fontFamily: fonts.bold, fontSize: 20, color: colors.heading },
  orderNo: { fontFamily: fontsAlt.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  statusPill: { borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10 },
  statusText: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.4 },

  // Timeline
  timeline: { flexDirection: "row", marginBottom: spacing(1) },
  timelineStep: { flex: 1, alignItems: "center" },
  timelineLineWrap: { flexDirection: "row", alignItems: "center", width: "100%", justifyContent: "center" },
  line: { flex: 1, height: 2, backgroundColor: colors.line },
  lineDone: { backgroundColor: colors.green },
  node: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.lineSoft, alignItems: "center", justifyContent: "center" },
  nodeDone: { backgroundColor: colors.green },
  nodeInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.muted },
  nodeInnerActive: { backgroundColor: colors.white },
  stepLabel: { fontFamily: fontsAlt.regular, fontSize: 11, color: colors.muted, marginTop: 6, textAlign: "center" },
  stepLabelDone: { color: colors.heading, fontFamily: fonts.semibold },

  // Partner
  partnerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.5),
    backgroundColor: colors.bg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    padding: spacing(2),
    marginTop: spacing(2.5),
  },
  partnerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.heading, alignItems: "center", justifyContent: "center" },
  partnerInitial: { fontFamily: fonts.bold, fontSize: 18, color: colors.white },
  partnerName: { fontFamily: fonts.bold, fontSize: 15, color: colors.heading },
  partnerRole: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginTop: 1 },
  callBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.greenTint, alignItems: "center", justifyContent: "center" },

  // Address
  addrCard: {
    flexDirection: "row",
    gap: spacing(1.25),
    alignItems: "center",
    backgroundColor: colors.bgSoft,
    borderRadius: 14,
    padding: spacing(1.75),
    marginTop: spacing(1.5),
  },
  addrIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.greenTint, alignItems: "center", justifyContent: "center" },
  addrText: { flex: 1, fontFamily: fontsAlt.regular, fontSize: 13, color: colors.text, lineHeight: 19 },

  detailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.green,
    marginTop: spacing(2.5),
  },
  detailsText: { fontFamily: fonts.bold, fontSize: 15, color: colors.green },
});
