import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, Linking, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  Address,
  OrderItemDetail,
  useAddressesQuery,
  useChangeOrderAddressMutation,
  useOrderDetailQuery,
} from "../api/baseApi";
import { imageUrl } from "../api/config";
import { DeliveredCelebration } from "../components/DeliveredCelebration";
import { useInvoiceDownloader } from "../invoices/useInvoiceDownloader";
import { NumberPlate } from "../components/NumberPlate";
import { Screen } from "../components/Screen";
import { DetailSkeleton } from "../components/Skeleton";
import TrackingMap from "../components/TrackingMap";
import { useToast } from "../components/Toast";
import type { ProfileStackParamList } from "../navigation/ProfileStack";
import { colors, fonts, fontsAlt, spacing } from "../theme";

const money = (n: number | string) => "₹" + Number(n).toFixed(2);
const TINTS = ["#f6efdf", "#e2ecf9", "#e6f5ec", "#fde2e4", "#efe6f7", "#e2f3f5"];

const RETURNED_AMBER = "#b46b00";

const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  pending: { label: "PENDING", bg: "#fff4d6", fg: "#b98421" },
  confirmed: { label: "CONFIRMED", bg: colors.greenTint, fg: colors.green },
  out_for_delivery: { label: "ON THE WAY", bg: "#fff4d6", fg: "#b98421" },
  delivered: { label: "DELIVERED", bg: "#e8f2fc", fg: colors.info },
  cancelled: { label: "CANCELLED", bg: colors.errorTint, fg: colors.error },
  returned: { label: "RETURNED", bg: "#fdecd9", fg: RETURNED_AMBER },
};
const statusOf = (s: string) => STATUS[s] ?? { label: s.toUpperCase(), bg: colors.lineSoft, fg: colors.heading };

// The 4-step happy path; a returned order swaps the final step to "Returned".
const BASE_STEPS = ["Confirmed", "Packed", "On the way", "Delivered"];
const STEP_INDEX: Record<string, number> = { pending: 0, confirmed: 1, out_for_delivery: 2, delivered: 3 };

function fmtDate(iso: string) {
  const d = new Date(iso);
  const day = d.getDate();
  const mon = d.toLocaleDateString(undefined, { month: "short" });
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${day} ${mon}, ${time}`;
}

// "YYYY-MM-DD" → "Tue, 30 Jun" for the next-day delivery date.
function fmtDay(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

// Local calendar date as "YYYY-MM-DD" (string-comparable with delivery_date).
function localToday() {
  const n = new Date();
  const p = (x: number) => String(x).padStart(2, "0");
  return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}`;
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
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const toast = useToast();
  const { download: downloadInvoice, busy: invoiceBusy } = useInvoiceDownloader();
  // Poll while the order is in progress so the timeline + live map update on
  // their own (e.g. the moment the rider picks up → "On the way" + map appears),
  // no pull-to-refresh needed. Stops once the order reaches a terminal state.
  const [live, setLive] = useState(true);
  const { data: order, isLoading, refetch } = useOrderDetailQuery(orderNumber, {
    pollingInterval: live ? 3000 : 0,
  });
  useEffect(() => {
    if (order) setLive(!["delivered", "cancelled", "returned"].includes(order.status));
  }, [order?.status]);
  // Background polling updates silently; only spin the pull-to-refresh control
  // for an explicit user pull (not on every poll).
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);
  const [eta, setEta] = useState("");

  // Change-delivery-address sheet (only while the order is still editable).
  const [addrSheet, setAddrSheet] = useState(false);
  const [changeAddress, { isLoading: changingAddress }] = useChangeOrderAddressMutation();
  const pickAddress = useCallback(
    async (addressId: number) => {
      if (!order) return;
      try {
        await changeAddress({ order_number: order.order_number, address_id: addressId }).unwrap();
        toast("Delivery address updated.");
        setAddrSheet(false);
        refetch();
      } catch (e: any) {
        toast(e?.data?.error || "Couldn't change the address.", "error");
      }
    },
    [order, changeAddress, toast, refetch],
  );

  if (isLoading || !order) {
    return (
      <Screen padded={false}>
        <DetailSkeleton />
      </Screen>
    );
  }

  const s = statusOf(order.status);
  // The delivery address can still be changed before anyone is out delivering.
  const canEditAddress = order.status === "pending" || order.status === "confirmed";
  const returned = order.status === "returned";
  // Returned orders show "Returned" as the final step (only then); otherwise the
  // normal 4-step path. The returned step sits at index 3 and is the active one.
  const STEPS = returned ? ["Confirmed", "Packed", "On the way", "Returned"] : BASE_STEPS;
  // A next-day pre-order that no operator has advanced yet progresses by date:
  // "Confirmed" is ticked the moment it's placed, and "Packed" ticks on its
  // delivery day. We mark only the milestones reached (the next one stays an
  // empty/pending node — no pulsing "active" dot) so it reads as "waiting".
  const nextDayPreorder = order.delivery_type === "next_day" && order.status === "pending";
  let step: number;
  let suppressActive = false;
  if (returned) {
    step = 3;
  } else if (nextDayPreorder) {
    const arrived = !!order.delivery_date && order.delivery_date <= localToday();
    step = arrived ? 2 : 1; // 1 → Confirmed ticked; 2 → Packed ticked (on the day)
    suppressActive = true;
  } else {
    step = STEP_INDEX[order.status] ?? 0;
  }
  const tracking = order.status === "out_for_delivery";
  const rider = order.assignment;

  // Live map shows only once we're out for delivery and have both endpoints.
  const riderGeo =
    rider?.rider_lat && rider?.rider_lng
      ? { lat: Number(rider.rider_lat), lng: Number(rider.rider_lng) }
      : null;
  const destGeo = order.destination
    ? { lat: Number(order.destination.lat), lng: Number(order.destination.lng) }
    : null;
  const showMap = tracking && !!riderGeo && !!destGeo;

  // Straight-line ETA as the initial label until the map reports along-route ETA.
  let initialEta = "Your order is on the way";
  if (showMap) {
    const km = haversineKm(riderGeo!, destGeo!);
    initialEta = `Arriving in ~${Math.max(1, Math.round((km / 18) * 60))} min · ${
      km < 1 ? Math.round(km * 1000) + " m" : km.toFixed(1) + " km"
    } away`;
  }

  return (
    <Screen padded={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} colors={[colors.green]} />
        }
      >
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
              {/* Delivered → celebration card sits at the top, above the track. */}
              {order.status === "delivered" ? (
                <View style={styles.celebrateWrap}>
                  <DeliveredCelebration
                    orderNumber={order.order_number}
                    total={order.total}
                    deliveredAt={order.assignment?.delivered_at ?? order.updated_at}
                    riderName={rider?.rider_name}
                    onReorder={() => toast("Reorder — coming soon.")}
                  />
                </View>
              ) : null}

              {/* Live tracking map (OSM tiles + OSRM road route, like the web) */}
              {showMap ? (
                <View style={styles.mapWrap}>
                  <TrackingMap rider={riderGeo!} destination={destGeo!} onEta={setEta} />
                  <View style={styles.mapPill} pointerEvents="none">
                    <View style={styles.dot} />
                    <Text style={styles.mapPillText} numberOfLines={1}>
                      {eta || initialEta}
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* Status timeline */}
              <View style={styles.card}>
                <View style={styles.timelineHead}>
                  <Text style={styles.arriving}>
                    {returned || order.status === "delivered" ? "Order Journey" : "Arriving soon"}
                  </Text>
                  {tracking ? <Text style={styles.liveTrack}>Live track</Text> : null}
                </View>
                <View style={styles.timeline}>
                  {STEPS.map((label, i) => {
                    const done = i < step;
                    const active = i === step;
                    // For next-day pre-orders we don't highlight a "current" node —
                    // only the reached milestones tick, the rest stay pending.
                    const activeShown = active && !suppressActive;
                    const isFirst = i === 0;
                    const isLast = i === STEPS.length - 1;
                    const isReturnStep = returned && isLast;
                    // The final "Delivered" step is the active step once delivered;
                    // show a checkmark on it (not the pending dot) to mark completion.
                    const isDeliveredStep = order.status === "delivered" && active && isLast;
                    return (
                      <View
                        key={i}
                        style={[
                          styles.timelineStep,
                          // First/last circles sit flush at the start/end of the
                          // track (no dangling line before the first or after the
                          // last); their labels hug the same edge.
                          isFirst && styles.timelineStepFirst,
                          isLast && styles.timelineStepLast,
                        ]}
                      >
                        <View style={styles.timelineLineWrap}>
                          {!isFirst ? <View style={[styles.line, i <= step && styles.lineDone]} /> : null}
                          <View
                            style={[
                              styles.node,
                              (done || activeShown) && styles.nodeDone,
                              activeShown && styles.nodeActive,
                              isReturnStep && active && styles.nodeReturned,
                            ]}
                          >
                            {isReturnStep && active ? (
                              <Ionicons name="arrow-undo" size={12} color={colors.white} />
                            ) : done || isDeliveredStep ? (
                              <Ionicons name="checkmark" size={13} color={colors.white} />
                            ) : (
                              <View style={[styles.nodeInner, activeShown && styles.nodeInnerActive]} />
                            )}
                          </View>
                          {!isLast ? <View style={[styles.line, i < step && styles.lineDone]} /> : null}
                        </View>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.stepLabel,
                            isFirst && styles.stepLabelFirst,
                            isLast && styles.stepLabelLast,
                            (done || activeShown) && styles.stepLabelDone,
                            isReturnStep && active && styles.stepLabelReturned,
                          ]}
                        >
                          {label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Delivery OTP — share with the rider at the door (like the web).
                  Shown whenever a rider is assigned and the order isn't finished. */}
              {rider?.delivery_otp && !["delivered", "cancelled", "returned"].includes(order.status) ? (
                <View style={styles.otpCard}>
                  <View style={styles.otpIcon}>
                    <Ionicons name="lock-closed" size={16} color={colors.green} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.otpLabel}>Delivery OTP</Text>
                    <Text style={styles.otpHint}>Share with your delivery partner</Text>
                  </View>
                  <Text style={styles.otpCode}>{rider.delivery_otp}</Text>
                </View>
              ) : null}

              {/* Delivery partner — name, role + vehicle plate, and phone. */}
              {rider?.rider_name ? (
                <View style={styles.card}>
                  <View style={styles.partnerRow}>
                    <View style={styles.partnerAvatar}>
                      <Text style={styles.partnerInitial}>{(rider.rider_name[0] || "R").toUpperCase()}</Text>
                    </View>
                    <View style={styles.partnerInfo}>
                      <Text style={styles.partnerName} numberOfLines={1}>{rider.rider_name}</Text>
                      <Text style={styles.partnerRole}>Delivery partner</Text>
                      {rider.rider_phone ? (
                        <Text style={styles.partnerPhone}>{rider.rider_phone}</Text>
                      ) : null}
                    </View>
                    {rider.vehicle_number ? (
                      <NumberPlate number={rider.vehicle_number} style={{ marginLeft: spacing(1.25) }} />
                    ) : null}
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

          {/* Delivery timing */}
          <Text style={styles.secLabel}>DELIVERY</Text>
          <View style={styles.deliveryCard}>
            <View style={styles.deliveryIcon}>
              <Ionicons
                name={order.delivery_type === "next_day" ? "sunny-outline" : "flash"}
                size={16}
                color={colors.green}
              />
            </View>
            <Text style={styles.deliveryText}>
              {order.delivery_type === "next_day"
                ? `Next-day delivery${order.delivery_date ? ` · ${fmtDay(order.delivery_date)}` : ""}`
                : "Instant delivery"}
            </Text>
          </View>

          {/* Address — changeable while the order is still pending/confirmed. */}
          <View style={styles.secHeadRow}>
            <Text style={styles.secLabelInline}>DELIVERY ADDRESS</Text>
            {canEditAddress ? (
              <Pressable style={styles.editLink} onPress={() => setAddrSheet(true)} hitSlop={8}>
                <Ionicons name="create-outline" size={14} color={colors.green} />
                <Text style={styles.editLinkText}>Change</Text>
              </Pressable>
            ) : null}
          </View>
          <Pressable
            style={({ pressed }) => [styles.addrCard, pressed && canEditAddress && { opacity: 0.85 }]}
            onPress={canEditAddress ? () => setAddrSheet(true) : undefined}
          >
            <View style={styles.addrIcon}>
              <Ionicons name="home-outline" size={16} color={colors.green} />
            </View>
            <Text style={styles.addrText}>{order.address_snapshot}</Text>
            {canEditAddress ? <Ionicons name="chevron-forward" size={16} color={colors.muted} /> : null}
          </Pressable>

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

          {/* Download invoice — available once the order is delivered. */}
          {order.status === "delivered" ? (
            <Pressable
              style={({ pressed }) => [styles.invoiceBtn, pressed && { opacity: 0.85 }]}
              onPress={() => downloadInvoice(order.order_number)}
              disabled={invoiceBusy}
            >
              {invoiceBusy ? (
                <ActivityIndicator size="small" color="#b98421" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={17} color="#b98421" />
                  <Text style={styles.invoiceText}>Download invoice</Text>
                </>
              )}
            </Pressable>
          ) : null}

          {/* Actions — hidden once delivered (the celebration card carries
              Rate order / Reorder); shown for active orders to track + get help. */}
          {order.status !== "cancelled" && order.status !== "delivered" ? (
            <View style={styles.actions}>
              <Pressable
                style={({ pressed }) => [styles.trackBtn, pressed && { opacity: 0.85 }]}
                onPress={() => navigation.navigate("TrackOrder", { orderNumber: order.order_number })}
              >
                <Text style={styles.trackText}>Track Order</Text>
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

      {addrSheet ? (
        <AddressSheet
          currentId={order.address_id}
          onPick={pickAddress}
          onClose={() => setAddrSheet(false)}
          saving={changingAddress}
          onAddNew={() => {
            setAddrSheet(false);
            navigation.navigate("AddAddress");
          }}
        />
      ) : null}
    </Screen>
  );
}

// Pick a different saved address (Home / Work / …) for an in-progress order.
function AddressSheet({
  currentId,
  onPick,
  onClose,
  saving,
  onAddNew,
}: {
  currentId: number | null;
  onPick: (id: number) => void;
  onClose: () => void;
  saving: boolean;
  onAddNew: () => void;
}) {
  const { data: addresses, isLoading } = useAddressesQuery();
  const iconFor = (label: string) => {
    const l = (label || "").toLowerCase();
    if (l.includes("home")) return "home" as const;
    if (l.includes("work") || l.includes("office")) return "briefcase" as const;
    return "location" as const;
  };
  const fullAddr = (a: Address) =>
    [a.address_line, a.landmark, a.city, `${a.state} ${a.pincode}`].filter((p) => p && p.trim()).join(", ");

  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={sheet.root}>
        <Pressable style={sheet.backdrop} onPress={onClose} />
        <View style={[sheet.sheet, { maxHeight: "82%" }]}>
          <View style={sheet.handle} />
          <Text style={sheet.title}>Change delivery address</Text>
          <Text style={sheet.sub}>Pick one of your saved addresses</Text>

          <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: spacing(1.5) }}>
            {isLoading ? (
              <ActivityIndicator color={colors.green} style={{ marginVertical: spacing(3) }} />
            ) : (addresses ?? []).length === 0 ? (
              <Text style={sheet.empty}>No saved addresses yet.</Text>
            ) : (
              (addresses ?? []).map((a) => {
                const selected = a.id === currentId;
                return (
                  <Pressable
                    key={a.id}
                    style={[sheet.addr, selected && sheet.addrSelected]}
                    onPress={() => onPick(a.id)}
                    disabled={saving}
                  >
                    <View style={[sheet.addrIcon, selected && sheet.addrIconSelected]}>
                      <Ionicons name={iconFor(a.label)} size={16} color={selected ? colors.white : colors.green} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={sheet.addrTop}>
                        <Text style={sheet.addrLabel} numberOfLines={1}>{a.label || "Address"}</Text>
                        {a.is_default ? (
                          <View style={sheet.defBadge}><Text style={sheet.defText}>DEFAULT</Text></View>
                        ) : null}
                      </View>
                      <Text style={sheet.addrLine} numberOfLines={2}>{fullAddr(a)}</Text>
                    </View>
                    {selected ? (
                      <Ionicons name="checkmark-circle" size={22} color={colors.green} />
                    ) : (
                      <View style={sheet.radio} />
                    )}
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          <Pressable style={sheet.addNew} onPress={onAddNew} disabled={saving}>
            <Ionicons name="add" size={18} color={colors.green} />
            <Text style={sheet.addNewText}>Add a new address</Text>
          </Pressable>
          {saving ? (
            <View style={sheet.savingRow}>
              <ActivityIndicator size="small" color={colors.green} />
              <Text style={sheet.savingText}>Updating…</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
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

  // Live tracking map
  mapWrap: { position: "relative" },
  mapPill: {
    position: "absolute",
    left: spacing(1.5),
    bottom: spacing(1.5),
    right: spacing(1.5),
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.green },
  mapPillText: { flex: 1, fontFamily: fonts.semibold, fontSize: 12, color: colors.heading },

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
  timelineStepFirst: { alignItems: "flex-start" },
  timelineStepLast: { alignItems: "flex-end" },
  timelineLineWrap: { flexDirection: "row", alignItems: "center", width: "100%", justifyContent: "center" },
  line: { flex: 1, height: 2, backgroundColor: colors.line },
  lineDone: { backgroundColor: colors.green },
  node: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.lineSoft, alignItems: "center", justifyContent: "center" },
  nodeDone: { backgroundColor: colors.green },
  nodeActive: { backgroundColor: colors.green },
  nodeInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.muted },
  nodeInnerActive: { backgroundColor: colors.white },
  nodeReturned: { backgroundColor: RETURNED_AMBER },
  stepLabel: { fontFamily: fontsAlt.regular, fontSize: 11, color: colors.muted, marginTop: 6, textAlign: "center" },
  stepLabelFirst: { textAlign: "left" },
  stepLabelLast: { textAlign: "right" },
  stepLabelDone: { color: colors.heading, fontFamily: fonts.semibold },
  stepLabelReturned: { color: RETURNED_AMBER, fontFamily: fonts.bold },

  // Delivery OTP
  otpCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.25),
    backgroundColor: colors.greenTint,
    borderRadius: 16,
    padding: spacing(1.75),
    marginTop: spacing(1.5),
  },
  otpIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  otpLabel: { fontFamily: fonts.bold, fontSize: 14, color: colors.heading },
  otpHint: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.green, marginTop: 1 },
  otpCode: { fontFamily: fonts.bold, fontSize: 22, color: colors.green, letterSpacing: 3 },

  // Partner
  partnerRow: { flexDirection: "row", alignItems: "center" },
  partnerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.heading, alignItems: "center", justifyContent: "center" },
  partnerInitial: { fontFamily: fonts.bold, fontSize: 18, color: colors.white },
  partnerInfo: { flexShrink: 1, marginLeft: spacing(1.5) },
  partnerName: { fontFamily: fonts.bold, fontSize: 14, color: colors.heading },
  partnerRole: { fontFamily: fontsAlt.regular, fontSize: 10, color: colors.muted, marginTop: 1 },
  partnerPhone: { fontFamily: fonts.semibold, fontSize: 11, color: colors.green, marginTop: 2 },
  // Call button. marginLeft is the gap between the plate and this icon — raise it
  // for more space, lower it for less.
  callBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.greenTint, alignItems: "center", justifyContent: "center", marginLeft: spacing(1) },


  celebrateWrap: { marginBottom: spacing(2) },

  secLabel: { fontFamily: fontsAlt.extrabold, fontSize: 11, letterSpacing: 1, color: colors.muted, marginTop: spacing(3), marginBottom: spacing(1) },
  secHeadRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing(3), marginBottom: spacing(1) },
  secLabelInline: { fontFamily: fontsAlt.extrabold, fontSize: 11, letterSpacing: 1, color: colors.muted },
  editLink: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.greenTint, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  editLinkText: { fontFamily: fonts.bold, fontSize: 12, color: colors.green },

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

  deliveryCard: { flexDirection: "row", gap: spacing(1.25), alignItems: "center", backgroundColor: colors.bg, borderRadius: 14, borderWidth: 1, borderColor: colors.lineSoft, padding: spacing(1.75) },
  deliveryIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.greenTint, alignItems: "center", justifyContent: "center" },
  deliveryText: { flex: 1, fontFamily: fonts.semibold, fontSize: 13, color: colors.heading },

  addrCard: { flexDirection: "row", gap: spacing(1.25), alignItems: "center", backgroundColor: colors.bg, borderRadius: 14, borderWidth: 1, borderColor: colors.lineSoft, padding: spacing(1.75) },
  addrIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.greenTint, alignItems: "center", justifyContent: "center" },
  addrText: { flex: 1, fontFamily: fontsAlt.regular, fontSize: 13, color: colors.text, lineHeight: 19 },

  billCard: { backgroundColor: colors.bgSoft, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: spacing(1.75) },
  billRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing(0.5) },
  billLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.heading },
  billValue: { fontFamily: fonts.semibold, fontSize: 14, color: colors.heading },
  billStrong: { fontFamily: fonts.bold, fontSize: 16 },
  billDivider: { height: 1, backgroundColor: colors.line, marginVertical: spacing(1) },

  invoiceBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 50, borderRadius: 14, backgroundColor: colors.yellowTint, marginTop: spacing(2) },
  invoiceText: { fontFamily: fonts.bold, fontSize: 15, color: "#b98421" },
  actions: { flexDirection: "row", gap: spacing(1.25), marginTop: spacing(2.5) },
  trackBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.green, alignItems: "center", justifyContent: "center" },
  trackText: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },
  helpBtn: { width: 110, height: 52, borderRadius: 14, backgroundColor: colors.bgSoft, alignItems: "center", justifyContent: "center" },
  helpText: { fontFamily: fonts.bold, fontSize: 16, color: colors.heading },
});

const sheet = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "transparent" },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing(2.5),
    paddingTop: spacing(1.25),
    paddingBottom: spacing(3),
    shadowColor: "#1c2b36",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 16,
  },
  handle: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: spacing(1.5) },
  title: { fontFamily: fonts.bold, fontSize: 18, color: colors.heading },
  sub: { fontFamily: fontsAlt.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  empty: { fontFamily: fontsAlt.regular, fontSize: 14, color: colors.muted, textAlign: "center", marginVertical: spacing(3) },

  addr: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.25),
    backgroundColor: colors.bg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    padding: spacing(1.5),
    marginBottom: spacing(1.25),
  },
  addrSelected: { borderColor: colors.green, backgroundColor: colors.greenTint },
  addrIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.greenTint, alignItems: "center", justifyContent: "center" },
  addrIconSelected: { backgroundColor: colors.green },
  addrTop: { flexDirection: "row", alignItems: "center", gap: spacing(1) },
  addrLabel: { flexShrink: 1, fontFamily: fonts.bold, fontSize: 14, color: colors.heading },
  defBadge: { backgroundColor: "#e8f2fc", borderRadius: 6, paddingVertical: 1.5, paddingHorizontal: 6 },
  defText: { fontFamily: fontsAlt.extrabold, fontSize: 8, letterSpacing: 0.5, color: colors.info },
  addrLine: { fontFamily: fontsAlt.regular, fontSize: 12.5, color: colors.muted, marginTop: 3, lineHeight: 17 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.line },

  addNew: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: colors.green, borderStyle: "dashed", marginTop: spacing(0.5) },
  addNewText: { fontFamily: fonts.bold, fontSize: 14, color: colors.green },
  savingRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: spacing(1.5) },
  savingText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.green },
});
