import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  Address,
  DeliverySlot,
  useAddressesQuery,
  useCartQuery,
  useCheckoutMutation,
  useDeliverySlotsQuery,
  useInitiatePaymentMutation,
  useServiceabilityCheckQuery,
} from "../api/baseApi";
import { Screen } from "../components/Screen";
import { useToast } from "../components/Toast";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { colors, fonts, fontsAlt, spacing } from "../theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];
const money = (n: number | string) => "₹" + Number(n).toFixed(2);
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

type Pay = { key: string; title: string; sub: string; icon: IoniconName; backend: string; tint: string; fg: string };
const PAYMENTS: Pay[] = [
  { key: "upi", title: "UPI", sub: "Pay via any UPI app", icon: "phone-portrait-outline", backend: "online", tint: "#e8f2fc", fg: colors.info },
  { key: "card", title: "Card", sub: "Credit / Debit card", icon: "card-outline", backend: "online", tint: colors.greenTint, fg: colors.green },
  { key: "cod", title: "Cash on Delivery", sub: "Pay when it arrives", icon: "cash-outline", backend: "cod", tint: "#fff4d6", fg: "#b98421" },
  { key: "wallet", title: "MilkKart Wallet", sub: "Pay from your balance", icon: "wallet-outline", backend: "wallet", tint: "#efe6f7", fg: "#7c5cd6" },
];

function formatAddress(a: Address) {
  return [a.address_line, a.landmark, a.city, `${a.state} ${a.pincode}`.trim()]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(", ");
}

function to12(t: string) {
  const [hh, mm] = t.split(":");
  let h = parseInt(hh, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return mm && mm !== "00" ? `${h}:${mm} ${ampm}` : `${h} ${ampm}`;
}
function slotTime(s: DeliverySlot) {
  return `${to12(s.start_time).replace(/ [AP]M$/, "")} – ${to12(s.end_time)}`;
}
function dayLabel(date: string) {
  const d = new Date(date + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function CheckoutScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const toast = useToast();
  const { data: addresses } = useAddressesQuery();
  const { data: slots } = useDeliverySlotsQuery();
  const { data: cart } = useCartQuery();
  const [checkout, { isLoading: placingCheckout }] = useCheckoutMutation();
  const [initiatePayment, { isLoading: paying }] = useInitiatePaymentMutation();

  const [addressId, setAddressId] = useState<number | null>(null);
  const [slotId, setSlotId] = useState<number | null>(null); // null = Instant
  const [method, setMethod] = useState("upi");

  useEffect(() => {
    if (addressId == null && addresses?.length) {
      const def = addresses.find((a) => a.is_default) || addresses[0];
      setAddressId(def.id);
    }
  }, [addresses, addressId]);

  const selected = addresses?.find((a) => a.id === addressId);
  const bill = cart?.bill;

  // Serviceability of the selected address → ETA shown on the Instant slot.
  const { data: svc } = useServiceabilityCheckQuery(
    {
      pincode: selected?.pincode,
      lat: selected?.latitude ?? undefined,
      lng: selected?.longitude ?? undefined,
    },
    { skip: !selected },
  );
  const eta = svc?.area?.delivery_eta_minutes ?? 30;

  // Only today/tomorrow-and-later slots (the dev DB has stale past ones).
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const upcomingSlots = (slots ?? [])
    .filter((s) => !s.is_full && new Date(s.date + "T00:00:00").getTime() >= todayStart.getTime())
    .slice(0, 4);
  const placing = placingCheckout || paying;

  async function placeOrder() {
    if (!addressId) {
      toast("Pick a delivery address.", "info");
      return;
    }
    const pm = PAYMENTS.find((p) => p.key === method)!;
    if (pm.backend === "online") {
      toast("Online payment (UPI/Card) is coming soon — use Cash on Delivery or Wallet for now.", "info");
      return;
    }
    try {
      const order = await checkout({
        address_id: addressId,
        delivery_slot_id: slotId ?? undefined,
      }).unwrap();
      await initiatePayment({ order_number: order.order_number, method: pm.backend }).unwrap();
      toast("Order placed successfully!");
      navigation.goBack();
    } catch (e: any) {
      toast(e?.data?.error || "Couldn't place the order. Please try again.", "error");
    }
  }

  return (
    <Screen padded={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.blob} />
          <Text style={styles.headerTitle}>Checkout</Text>
          <Text style={styles.headerSub}>Confirm & pay</Text>
        </View>

        <View style={styles.body}>
          {/* Delivery address */}
          <Text style={styles.sectionLabel}>DELIVERY ADDRESS</Text>
          {addresses && addresses.length > 0 ? (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {addresses.map((a) => {
                  const active = a.id === addressId;
                  return (
                    <Pressable
                      key={a.id}
                      onPress={() => setAddressId(a.id)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Ionicons
                        name="home-outline"
                        size={14}
                        color={active ? colors.green : colors.muted}
                      />
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{cap(a.label)}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              {selected ? (
                <View style={styles.addrCard}>
                  <View style={styles.addrTop}>
                    <View style={styles.addrIcon}>
                      <Ionicons name="home-outline" size={16} color={colors.green} />
                    </View>
                    <Text style={styles.addrLabel}>{cap(selected.label)}</Text>
                    {selected.is_default ? (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultText}>DEFAULT</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.addrText}>{formatAddress(selected)}</Text>
                </View>
              ) : null}
            </>
          ) : (
            <View style={styles.addrCard}>
              <Text style={styles.addrText}>Add a delivery address in your profile first.</Text>
            </View>
          )}

          {/* Delivery slot */}
          <Text style={styles.sectionLabel}>DELIVERY SLOT</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.slotRow}>
            <Pressable
              onPress={() => setSlotId(null)}
              style={[styles.slot, slotId === null && styles.slotActive]}
            >
              <Ionicons name="flash" size={16} color={slotId === null ? colors.green : colors.muted} />
              <Text style={[styles.slotTitle, slotId === null && styles.slotTitleActive]}>Instant</Text>
              <Text style={[styles.slotSub, slotId === null && styles.slotSubActive]}>Within {eta} min</Text>
            </Pressable>
            {upcomingSlots.map((s) => {
              const active = s.id === slotId;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => setSlotId(s.id)}
                  style={[styles.slot, active && styles.slotActive]}
                >
                  <Text style={[styles.slotTitle, active && styles.slotTitleActive]}>{dayLabel(s.date)}</Text>
                  <Text style={[styles.slotSub, active && styles.slotSubActive]}>{slotTime(s)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Payment method */}
          <Text style={styles.sectionLabel}>PAYMENT METHOD</Text>
          <View style={styles.payCard}>
            {PAYMENTS.map((p, i) => {
              const active = p.key === method;
              return (
                <Pressable
                  key={p.key}
                  onPress={() => setMethod(p.key)}
                  style={[styles.payRow, i > 0 && styles.payRowBorder]}
                >
                  <View style={[styles.payIcon, { backgroundColor: p.tint }]}>
                    <Ionicons name={p.icon} size={18} color={p.fg} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.payTitle}>{p.title}</Text>
                    <Text style={styles.paySub}>{p.sub}</Text>
                  </View>
                  <View style={[styles.radio, active && styles.radioActive]}>
                    {active ? <View style={styles.radioDot} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Bill summary */}
          {bill ? (
            <View style={styles.billCard}>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Item total</Text>
                <Text style={styles.billValue}>{money(bill.subtotal)}</Text>
              </View>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Delivery & fees</Text>
                <Text style={styles.billValue}>
                  {money(Number(bill.delivery_fee) + Number(bill.small_cart_fee))}
                </Text>
              </View>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Tax</Text>
                <Text style={styles.billValue}>{money(bill.tax)}</Text>
              </View>
              {Number(bill.coupon_discount) > 0 ? (
                <View style={styles.billRow}>
                  <Text style={[styles.billLabel, { color: colors.green }]}>Coupon ({bill.coupon_code})</Text>
                  <Text style={[styles.billValue, { color: colors.green }]}>
                    −{money(bill.coupon_discount)}
                  </Text>
                </View>
              ) : null}
              <View style={styles.billDivider} />
              <View style={styles.billRow}>
                <Text style={styles.billTotal}>Total</Text>
                <Text style={styles.billTotalValue}>{money(bill.grand_total)}</Text>
              </View>
            </View>
          ) : null}

          {/* Place order */}
          <Pressable
            style={[styles.placeBtn, placing && { opacity: 0.7 }]}
            onPress={placeOrder}
            disabled={placing}
          >
            <Text style={styles.placeText}>{placing ? "Placing…" : "Place Order"}</Text>
            <View style={styles.placeRight}>
              <Text style={styles.placeTotal}>{money(bill?.grand_total ?? 0)}</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.white} />
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  headerTitle: { fontFamily: fonts.bold, fontSize: 24, color: colors.white },
  headerSub: { fontFamily: fontsAlt.regular, fontSize: 13, color: colors.green, marginTop: 3 },

  body: { paddingHorizontal: spacing(2.5), paddingTop: spacing(2) },
  sectionLabel: {
    fontFamily: fontsAlt.extrabold,
    fontSize: 12,
    letterSpacing: 1,
    color: colors.muted,
    marginTop: spacing(2.5),
    marginBottom: spacing(1.25),
  },

  // Address
  chips: { gap: spacing(1), paddingRight: spacing(2.5) },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(2),
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.bg,
  },
  chipActive: { borderColor: colors.green, backgroundColor: colors.greenTint },
  chipText: { fontFamily: fonts.bold, fontSize: 14, color: colors.muted },
  chipTextActive: { color: colors.green },
  addrCard: {
    backgroundColor: colors.bg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    padding: spacing(1.75),
    marginTop: spacing(1.5),
  },
  addrTop: { flexDirection: "row", alignItems: "center" },
  addrIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.greenTint,
    alignItems: "center",
    justifyContent: "center",
  },
  addrLabel: { fontFamily: fonts.bold, fontSize: 15, color: colors.heading, marginLeft: spacing(1.25) },
  defaultBadge: { backgroundColor: colors.greenTint, borderRadius: 6, paddingVertical: 2, paddingHorizontal: 7, marginLeft: spacing(1) },
  defaultText: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.5, color: colors.green },
  addrText: { fontFamily: fontsAlt.regular, fontSize: 13, color: colors.text, lineHeight: 19, marginTop: spacing(1) },

  // Slots
  slotRow: { gap: spacing(1.25), paddingRight: spacing(2.5) },
  slot: {
    width: 108,
    minHeight: 74,
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 12,
    paddingVertical: spacing(1.25),
    paddingHorizontal: spacing(1.75),
    backgroundColor: colors.bg,
  },
  slotActive: { borderColor: colors.green, backgroundColor: colors.greenTint },
  slotTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.heading, marginTop: 2 },
  slotTitleActive: { color: colors.green },
  slotSub: { fontFamily: fontsAlt.regular, fontSize: 11, color: colors.muted, marginTop: 2 },
  slotSubActive: { color: colors.green },

  // Payment
  payCard: { backgroundColor: colors.bg, borderRadius: 16, borderWidth: 1, borderColor: colors.lineSoft },
  payRow: { flexDirection: "row", alignItems: "center", padding: spacing(1.75) },
  payRowBorder: { borderTopWidth: 1, borderTopColor: colors.lineSoft },
  payIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing(1.5),
  },
  payTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.heading },
  paySub: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginTop: 1 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: { borderColor: colors.green },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.green },

  // Bill
  billCard: {
    backgroundColor: colors.bg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    padding: spacing(1.75),
    marginTop: spacing(2.5),
  },
  billRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing(0.5) },
  billLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.heading },
  billValue: { fontFamily: fonts.semibold, fontSize: 14, color: colors.heading },
  billDivider: { height: 1, backgroundColor: "rgba(37,61,78,0.12)", marginVertical: spacing(1) },
  billTotal: { fontFamily: fonts.bold, fontSize: 16, color: colors.heading },
  billTotalValue: { fontFamily: fonts.bold, fontSize: 16, color: colors.green },

  // Place order
  placeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.green,
    borderRadius: 14,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(2.5),
    marginTop: spacing(2.5),
  },
  placeText: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },
  placeRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  placeTotal: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },
});
