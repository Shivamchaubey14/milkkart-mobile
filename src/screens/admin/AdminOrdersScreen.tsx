import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { ActivityIndicator, Alert, Image, Linking, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import {
  AdminOrder,
  AdminOrderDetail,
  useAdminAssignOrderMutation,
  useAdminCancelOrderMutation,
  useAdminConfirmOrderMutation,
  useAdminOrderDetailQuery,
  useAdminOrdersQuery,
} from "../../api/baseApi";
import { imageUrl } from "../../api/config";
import { Screen } from "../../components/Screen";
import { ListSkeleton } from "../../components/Skeleton";
import { useToast } from "../../components/Toast";
import { colors, fonts, fontsAlt, spacing } from "../../theme";

const money = (n: number | string) => "₹" + Number(n).toFixed(2);

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayLabel = (d: Date) => d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const FILTERS: [string, string][] = [
  ["", "All"],
  ["pending", "Pending"],
  ["confirmed", "Confirmed"],
  ["out_for_delivery", "Out"],
  ["delivered", "Delivered"],
  ["cancelled", "Cancelled"],
];

const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  pending: { label: "PENDING", bg: "#fff4d6", fg: "#b98421" },
  confirmed: { label: "CONFIRMED", bg: colors.greenTint, fg: colors.green },
  out_for_delivery: { label: "OUT FOR DELIVERY", bg: "#e8f2fc", fg: colors.info },
  delivered: { label: "DELIVERED", bg: "#e8f2fc", fg: colors.info },
  cancelled: { label: "CANCELLED", bg: colors.errorTint, fg: colors.error },
  returned: { label: "RETURNED", bg: "#fdecd9", fg: "#b46b00" },
};
const statusOf = (s: string) => STATUS[s] ?? { label: s.toUpperCase(), bg: colors.lineSoft, fg: colors.heading };

export default function AdminOrdersScreen() {
  const navigation = useNavigation();
  const toast = useToast();
  const [filter, setFilter] = useState("");
  // Default to today's orders; the date range is editable via the calendar buttons.
  const [start, setStart] = useState<Date>(today());
  const [end, setEnd] = useState<Date>(today());
  const [picker, setPicker] = useState<"start" | "end" | null>(null);
  const [selected, setSelected] = useState<string | null>(null); // order_number for the detail sheet
  const [query, setQuery] = useState("");
  const isToday = iso(start) === iso(today()) && iso(end) === iso(today());

  const { data: orders, isLoading, isFetching, refetch } = useAdminOrdersQuery(
    { status: filter || undefined, start: iso(start), end: iso(end) },
    { refetchOnMountOrArgChange: true },
  );
  const [confirmOrder] = useAdminConfirmOrderMutation();
  const [cancelOrder] = useAdminCancelOrderMutation();
  const [assignOrder] = useAdminAssignOrderMutation();

  function onPick(e: DateTimePickerEvent, d?: Date) {
    const which = picker;
    setPicker(null); // Android dialog dismisses on selection
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

  async function run(p: Promise<unknown>, ok: string) {
    try {
      await p;
      toast(ok);
    } catch (e: any) {
      toast(e?.data?.error || "Action failed. Please try again.", "error");
    }
  }

  // Client-side search across order #, customer name/phone and address.
  const q = query.trim().toLowerCase();
  const visible = (orders ?? []).filter(
    (o) =>
      !q ||
      o.order_number.toLowerCase().includes(q) ||
      (o.customer_name || "").toLowerCase().includes(q) ||
      (o.customer_phone || "").toLowerCase().includes(q) ||
      (o.address_snapshot || "").toLowerCase().includes(q),
  );

  const onConfirm = (o: AdminOrder) => run(confirmOrder(o.order_number).unwrap(), "Order confirmed");
  const onAssign = (o: AdminOrder) => run(assignOrder({ orderNumber: o.order_number }).unwrap(), "Rider assigned");
  const onCancel = (o: AdminOrder) =>
    Alert.alert("Cancel order", `Cancel #${o.order_number.slice(0, 8)}? Any payment is refunded.`, [
      { text: "Keep", style: "cancel" },
      { text: "Cancel order", style: "destructive", onPress: () => run(cancelOrder(o.order_number).unwrap(), "Cancelled & refunded") },
    ]);

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <View style={styles.blob} />
        <View style={styles.headerRow}>
          <Pressable style={styles.back} onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="arrow-back" size={20} color={colors.white} />
          </Pressable>
          <Text style={styles.headerTitle}>Orders</Text>
        </View>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={17} color={colors.muted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search order #, customer or address"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query ? (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={17} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Date filter — defaults to today; tap a calendar to change the range. */}
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

      <View style={styles.chipsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {FILTERS.map(([val, label]) => {
            const active = filter === val;
            return (
              <Pressable key={val || "all"} onPress={() => setFilter(val)} style={[styles.chip, active && styles.chipActive]}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.green} colors={[colors.green]} />
          }
        >
          {visible.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyBadge}>
                <Ionicons name={q ? "search-outline" : "receipt-outline"} size={30} color={colors.green} />
              </View>
              <Text style={styles.emptyTitle}>{q ? "No matches" : "No orders"}</Text>
              <Text style={styles.emptySub}>
                {q
                  ? `Nothing matches “${query.trim()}”.`
                  : isToday
                    ? "No orders today yet."
                    : "No orders for the selected dates."}
                {!q && filter ? " Try a different status." : ""}
              </Text>
            </View>
          ) : (
            visible.map((o) => {
              const s = statusOf(o.status);
              const canAct = o.status === "pending" || (o.status === "confirmed" && !o.rider);
              return (
                <Pressable
                  key={o.order_number}
                  style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
                  onPress={() => setSelected(o.order_number)}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{(o.customer_name?.trim()?.[0] || "C").toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.customer}>{o.customer_name?.trim() || "Customer"}</Text>
                      <Text style={styles.phone}>{o.customer_phone}</Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
                      <Text style={[styles.statusText, { color: s.fg }]}>{s.label}</Text>
                    </View>
                  </View>

                  <View style={styles.orderLine}>
                    <Text style={styles.orderNo}>#{o.order_number.slice(0, 8)}</Text>
                    <Text style={styles.sep}>·</Text>
                    <Text style={styles.meta}>{o.item_count} {o.item_count === 1 ? "item" : "items"}</Text>
                  </View>

                  {o.address_snapshot ? (
                    <View style={styles.addrRow}>
                      <Ionicons name="location-outline" size={14} color={colors.muted} style={{ marginTop: 1 }} />
                      <Text style={styles.addr}>{o.address_snapshot}</Text>
                    </View>
                  ) : null}

                  {o.rider ? (
                    <View style={styles.riderRow}>
                      <Ionicons name="bicycle-outline" size={14} color={colors.green} />
                      <Text style={styles.riderText}>{o.rider.phone} · {o.rider.status.replace(/_/g, " ")}</Text>
                    </View>
                  ) : null}

                  <View style={styles.divider} />
                  <View style={styles.footer}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.total}>{money(o.total)}</Text>
                  </View>

                  {canAct ? (
                    <View style={styles.actions}>
                      {o.status === "pending" ? (
                        <Pressable style={[styles.btn, styles.btnPrimary]} onPress={() => onConfirm(o)}>
                          <Text style={styles.btnPrimaryText}>Confirm</Text>
                        </Pressable>
                      ) : (
                        <Pressable style={[styles.btn, styles.btnPrimary]} onPress={() => onAssign(o)}>
                          <Text style={styles.btnPrimaryText}>Auto-assign rider</Text>
                        </Pressable>
                      )}
                      <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => onCancel(o)}>
                        <Text style={styles.btnGhostText}>Cancel</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </Pressable>
              );
            })
          )}
        </ScrollView>
      )}

      {selected ? <OrderDetailSheet orderNumber={selected} onClose={() => setSelected(null)} /> : null}
    </Screen>
  );
}

// ---- Order detail sheet — slides up from the bottom on card tap ------------
function OrderDetailSheet({ orderNumber, onClose }: { orderNumber: string; onClose: () => void }) {
  const { data: o, isLoading } = useAdminOrderDetailQuery(orderNumber);
  const s = o ? statusOf(o.status) : null;

  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={sheet.backdrop} onPress={onClose} />
      <View style={sheet.sheet}>
        <View style={sheet.handle} />
        {isLoading || !o ? (
          <ActivityIndicator color={colors.green} style={{ paddingVertical: spacing(5) }} />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={sheet.body}>
            {/* Title row */}
            <View style={sheet.titleRow}>
              <View style={{ flex: 1 }}>
                <Text style={sheet.orderNo}>#{o.order_number.slice(0, 8)}</Text>
                <Text style={sheet.placed}>{new Date(o.placed_at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</Text>
              </View>
              {s ? (
                <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
                  <Text style={[styles.statusText, { color: s.fg }]}>{s.label}</Text>
                </View>
              ) : null}
            </View>

            {/* Customer */}
            <View style={sheet.block}>
              <Text style={sheet.blockLabel}>CUSTOMER</Text>
              <Text style={sheet.custName}>{o.customer_name?.trim() || "Customer"}</Text>
              <Pressable style={sheet.phoneRow} onPress={() => Linking.openURL(`tel:${o.customer_phone}`)}>
                <Ionicons name="call-outline" size={14} color={colors.green} />
                <Text style={sheet.phone}>{o.customer_phone}</Text>
              </Pressable>
              {o.address_snapshot ? <Text style={sheet.addr}>{o.address_snapshot}</Text> : null}
            </View>

            {/* Delivery + rider */}
            <View style={sheet.row2}>
              <View style={[sheet.block, sheet.half]}>
                <Text style={sheet.blockLabel}>DELIVERY</Text>
                <Text style={sheet.value}>
                  {o.delivery_type === "next_day" ? "Next day" : "Instant"}
                  {o.delivery_type === "next_day" && o.delivery_date ? `\n${o.delivery_date}` : ""}
                </Text>
              </View>
              <View style={[sheet.block, sheet.half]}>
                <Text style={sheet.blockLabel}>RIDER</Text>
                <Text style={sheet.value}>
                  {o.rider ? `${o.rider.phone}\n${o.rider.status.replace(/_/g, " ")}` : "Unassigned"}
                </Text>
              </View>
            </View>

            {/* Items */}
            <Text style={sheet.section}>PRODUCTS ({o.items.length})</Text>
            {o.items.map((it) => {
              const img = imageUrl(it.image_url);
              return (
                <View key={it.id} style={sheet.itemRow}>
                  <View style={sheet.itemThumb}>
                    {img ? <Image source={{ uri: img }} style={sheet.itemImg} resizeMode="contain" /> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={sheet.itemName} numberOfLines={1}>{it.product_name}</Text>
                    <Text style={sheet.itemMeta}>
                      {it.variant_label ? `${it.variant_label} · ` : ""}{money(it.product_price)} × {it.quantity}
                    </Text>
                  </View>
                  <Text style={sheet.itemSub}>{money(it.subtotal)}</Text>
                </View>
              );
            })}

            {/* Bill */}
            <View style={sheet.bill}>
              <BillRow label="Subtotal" value={money(o.subtotal)} />
              {Number(o.discount) > 0 ? <BillRow label={`Discount${o.coupon_code ? ` (${o.coupon_code})` : ""}`} value={`−${money(o.discount)}`} green /> : null}
              <BillRow label="Delivery & fees" value={money(Number(o.delivery_fee) + Number(o.small_cart_fee))} />
              <BillRow label="Tax" value={money(o.tax)} />
              <View style={sheet.billDivider} />
              <BillRow label="Total" value={money(o.total)} strong />
              <View style={sheet.payRow}>
                <Text style={sheet.payLabel}>Payment</Text>
                <Text style={sheet.payValue}>{o.payment_label || "—"}</Text>
              </View>
            </View>

            <Pressable style={sheet.closeBtn} onPress={onClose}>
              <Text style={sheet.closeText}>Close</Text>
            </Pressable>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

function BillRow({ label, value, strong, green }: { label: string; value: string; strong?: boolean; green?: boolean }) {
  return (
    <View style={sheet.billRow}>
      <Text style={[sheet.billLabel, strong && sheet.billStrong]}>{label}</Text>
      <Text style={[sheet.billValue, strong && sheet.billStrong, green && { color: colors.green }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
  blob: { position: "absolute", top: -45, right: -30, width: 150, height: 150, borderRadius: 75, backgroundColor: "rgba(255,255,255,0.06)" },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing(1.5) },
  back: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: fonts.bold, fontSize: 22, color: colors.white },
  searchBar: { flexDirection: "row", alignItems: "center", gap: spacing(1), backgroundColor: colors.white, borderRadius: 12, paddingHorizontal: spacing(1.5), paddingVertical: Platform.OS === "ios" ? spacing(1.25) : spacing(0.5), marginTop: spacing(2) },
  searchInput: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.heading, padding: 0 },

  // Date filter — compact rounded-square calendar buttons
  dateBar: { flexDirection: "row", alignItems: "stretch", gap: spacing(0.75), paddingHorizontal: spacing(2.5), paddingTop: spacing(2) },
  dateBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(0.75),
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingVertical: spacing(0.75),
    paddingHorizontal: spacing(1),
  },
  calIcon: { width: 24, height: 24, borderRadius: 8, backgroundColor: colors.greenTint, alignItems: "center", justifyContent: "center" },
  dateText: { flex: 1, minWidth: 0 },
  dateCaption: { fontFamily: fontsAlt.extrabold, fontSize: 8, letterSpacing: 0.6, color: colors.muted },
  dateValue: { fontFamily: fonts.bold, fontSize: 12, color: colors.heading, marginTop: 1 },

  chipsWrap: { paddingTop: spacing(1.5) },
  chips: { gap: spacing(1), paddingHorizontal: spacing(2.5) },
  chip: { paddingVertical: spacing(0.75), paddingHorizontal: spacing(2), borderRadius: 999, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.bg },
  chipActive: { backgroundColor: colors.green, borderColor: colors.green },
  chipText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.heading },
  chipTextActive: { color: colors.white },

  list: { paddingHorizontal: spacing(2.5), paddingTop: spacing(2), paddingBottom: spacing(4) },
  card: { backgroundColor: colors.bg, borderRadius: 18, borderWidth: 1, borderColor: colors.lineSoft, padding: spacing(1.75), marginBottom: spacing(1.5) },
  cardTop: { flexDirection: "row", alignItems: "center", gap: spacing(1.25) },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.greenTint, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: fonts.bold, fontSize: 16, color: colors.green },
  customer: { fontFamily: fonts.bold, fontSize: 15, color: colors.heading },
  phone: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginTop: 1 },
  statusPill: { borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8 },
  statusText: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 0.4 },
  orderLine: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing(1.5) },
  orderNo: { fontFamily: fonts.bold, fontSize: 13, color: colors.heading },
  sep: { fontFamily: fonts.bold, fontSize: 13, color: colors.line },
  meta: { fontFamily: fontsAlt.regular, fontSize: 13, color: colors.muted },
  addrRow: { flexDirection: "row", gap: 6, marginTop: spacing(1) },
  addr: { flex: 1, fontFamily: fontsAlt.regular, fontSize: 13, color: colors.text, lineHeight: 19 },
  total: { fontFamily: fonts.bold, fontSize: 17, color: colors.green },
  totalLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  riderRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing(1) },
  riderText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.text },
  divider: { height: 1, backgroundColor: colors.lineSoft, marginTop: spacing(1.5) },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing(1.25) },
  actions: { flexDirection: "row", gap: spacing(1.25), marginTop: spacing(1.75) },
  btn: { flex: 1, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  btnPrimary: { backgroundColor: colors.green },
  btnPrimaryText: { fontFamily: fonts.bold, fontSize: 14, color: colors.white },
  btnGhost: { backgroundColor: colors.errorTint },
  btnGhostText: { fontFamily: fonts.bold, fontSize: 14, color: colors.error },

  empty: { alignItems: "center", paddingTop: spacing(6) },
  emptyBadge: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.greenTint, alignItems: "center", justifyContent: "center", marginBottom: spacing(2) },
  emptyTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.heading },
  emptySub: { fontFamily: fontsAlt.regular, fontSize: 13, color: colors.muted, marginTop: 4 },
});

const sheet = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, maxHeight: "86%", paddingHorizontal: spacing(2.5), paddingTop: spacing(1.25) },
  handle: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: spacing(1.5) },
  body: { paddingBottom: spacing(3) },

  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  orderNo: { fontFamily: fonts.bold, fontSize: 20, color: colors.heading },
  placed: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginTop: 2 },

  block: { backgroundColor: colors.bgSoft, borderRadius: 14, padding: spacing(1.5), marginTop: spacing(1.75) },
  blockLabel: { fontFamily: fontsAlt.extrabold, fontSize: 9, letterSpacing: 0.8, color: colors.muted, marginBottom: spacing(0.75) },
  custName: { fontFamily: fonts.bold, fontSize: 15, color: colors.heading },
  phoneRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing(0.75) },
  phone: { fontFamily: fonts.semibold, fontSize: 13, color: colors.green },
  addr: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.text, lineHeight: 18, marginTop: spacing(0.75) },
  row2: { flexDirection: "row", gap: spacing(1.5) },
  half: { flex: 1 },
  value: { fontFamily: fonts.semibold, fontSize: 13, color: colors.heading, lineHeight: 18 },

  section: { fontFamily: fontsAlt.extrabold, fontSize: 10, letterSpacing: 0.8, color: colors.muted, marginTop: spacing(2.5), marginBottom: spacing(1) },
  itemRow: { flexDirection: "row", alignItems: "center", gap: spacing(1.25), paddingVertical: spacing(0.75) },
  itemThumb: { width: 42, height: 42, borderRadius: 10, backgroundColor: colors.bgSoft, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  itemImg: { width: "100%", height: "100%" },
  itemName: { fontFamily: fonts.bold, fontSize: 13, color: colors.heading },
  itemMeta: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  itemSub: { fontFamily: fonts.bold, fontSize: 13, color: colors.heading },

  bill: { backgroundColor: colors.bgSoft, borderRadius: 14, padding: spacing(1.75), marginTop: spacing(2) },
  billRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing(0.5) },
  billLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.heading },
  billValue: { fontFamily: fonts.semibold, fontSize: 14, color: colors.heading },
  billStrong: { fontFamily: fonts.bold, fontSize: 16 },
  billDivider: { height: 1, backgroundColor: colors.line, marginVertical: spacing(1) },
  payRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing(1), paddingTop: spacing(1), borderTopWidth: 1, borderTopColor: colors.line },
  payLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  payValue: { fontFamily: fonts.bold, fontSize: 13, color: colors.heading },

  closeBtn: { height: 50, borderRadius: 14, backgroundColor: colors.heading, alignItems: "center", justifyContent: "center", marginTop: spacing(2.5) },
  closeText: { fontFamily: fonts.bold, fontSize: 15, color: colors.white },
});
