import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { imageUrl } from "../api/config";
import { Screen } from "../components/Screen";
import { useToast } from "../components/Toast";
import { addItem, CartLine, removeItem, selectCartCount } from "../store/cartSlice";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { colors, fonts, fontsAlt, palette, spacing } from "../theme";

const TINTS = ["#fde2e4", "#e2ecf9", "#e6f5ec", "#f6efdf", "#efe6f7", "#e2f3f5"];
const money = (n: number) => "₹" + n.toFixed(2);

export default function CartScreen() {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const items = useAppSelector((s) => s.cart.items);
  const lines = Object.values(items);
  const count = selectCartCount(items);

  const [code, setCode] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);

  // Placeholder bill math (the backend cart billing replaces this later).
  const subtotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
  const delivery = subtotal >= 200 || subtotal === 0 ? 0 : 25;
  const smallCartFee = subtotal > 0 && subtotal < 100 ? 15 : 0;
  const tax = +(subtotal * 0.05).toFixed(2);
  const discount = coupon ? Math.min(coupon.discount, subtotal) : 0;
  const toPay = Math.max(0, subtotal + delivery + smallCartFee + tax - discount);

  function applyCoupon() {
    const c = code.trim().toUpperCase();
    if (!c) {
      toast("Enter a coupon code.", "info");
      return;
    }
    // UI-only placeholder discount until the coupon API is wired.
    setCoupon({ code: c, discount: Math.round(subtotal * 0.1) });
    toast("Coupon applied.");
  }

  const billRow = (label: string, value: string, opts?: { strong?: boolean; accent?: boolean }) => (
    <View style={styles.billRow}>
      <Text style={[styles.billLabel, opts?.strong && styles.billStrong]}>{label}</Text>
      <Text style={[styles.billValue, opts?.strong && styles.billStrong, opts?.accent && styles.billAccent]}>
        {value}
      </Text>
    </View>
  );

  const header = (
    <View style={styles.header}>
      <View style={styles.blob} />
      <Text style={styles.headerTitle}>My Cart</Text>
      <Text style={styles.headerSub}>
        {count} {count === 1 ? "item" : "items"} · delivering to Home
      </Text>
    </View>
  );

  return (
    <Screen padded={false}>
      <View style={styles.flex}>
        {lines.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyBadge}>
              <Ionicons name="cart-outline" size={34} color={colors.green} />
            </View>
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptySub}>Add some fresh dairy to get started.</Text>
          </View>
        ) : (
          <>
            {/* Header + product list scroll together. */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              {header}
              <View style={styles.list}>
                {lines.map((l, i) => (
                  <CartCard key={l.id} line={l} tint={TINTS[i % TINTS.length]} dispatch={dispatch} />
                ))}
              </View>
            </ScrollView>

            {/* Fixed footer: coupon + bill details + checkout. */}
            <View style={styles.footer}>
              <View style={styles.couponRow}>
                <View style={styles.couponInputWrap}>
                  <Ionicons name="pricetag-outline" size={16} color={colors.green} />
                  <TextInput
                    style={styles.couponInput}
                    value={code}
                    onChangeText={setCode}
                    placeholder="Enter coupon code"
                    placeholderTextColor={colors.muted}
                    autoCapitalize="characters"
                  />
                </View>
                <Pressable style={styles.applyBtn} onPress={applyCoupon}>
                  <Text style={styles.applyText}>Apply</Text>
                </Pressable>
              </View>

              <Text style={styles.billHead}>BILL DETAILS</Text>
              <View style={styles.billCard}>
                {billRow("Subtotal", money(subtotal))}
                {coupon ? (
                  <View style={styles.billRow}>
                    <Pressable onPress={() => setCoupon(null)}>
                      <Text style={[styles.billLabel, styles.couponLabel]}>
                        Coupon ({coupon.code}) · Remove
                      </Text>
                    </Pressable>
                    <Text style={[styles.billValue, styles.discountValue]}>−{money(discount)}</Text>
                  </View>
                ) : null}
                {billRow("Delivery", delivery > 0 ? money(delivery) : "FREE")}
                {smallCartFee > 0 ? billRow("Small-cart fee", money(smallCartFee)) : null}
                {billRow("Tax", money(tax))}
                <View style={styles.billDivider} />
                {billRow("To Pay", money(toPay), { strong: true, accent: true })}
              </View>

              <Pressable style={styles.checkoutBtn} onPress={() => toast("Checkout — coming soon.")}>
                <Text style={styles.checkoutText}>Checkout</Text>
                <View style={styles.checkoutRight}>
                  <Text style={styles.checkoutTotal}>{money(toPay)}</Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.white} />
                </View>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </Screen>
  );
}

function CartCard({
  line,
  tint,
  dispatch,
}: {
  line: CartLine;
  tint: string;
  dispatch: ReturnType<typeof useAppDispatch>;
}) {
  const img = imageUrl(line.image);
  const { qty, ...snapshot } = line; // eslint-disable-line @typescript-eslint/no-unused-vars
  return (
    <View style={styles.card}>
      <View style={[styles.cardArt, { backgroundColor: tint }]}>
        {img ? <Image source={{ uri: img }} style={styles.cardImg} resizeMode="contain" /> : null}
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={2}>
          {line.name}
        </Text>
        {line.variantLabel ? <Text style={styles.cardVariant}>{line.variantLabel}</Text> : null}
        <Text style={styles.cardPrice}>{money(line.price)}</Text>
      </View>
      <View style={styles.stepper}>
        <Pressable onPress={() => dispatch(removeItem(line.id))} hitSlop={6} style={styles.stepBtn}>
          <Ionicons name="remove" size={16} color={colors.white} />
        </Pressable>
        <Text style={styles.stepQty}>{line.qty}</Text>
        <Pressable onPress={() => dispatch(addItem(snapshot))} hitSlop={6} style={styles.stepBtn}>
          <Ionicons name="add" size={16} color={colors.white} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  // Header
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

  // Empty
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
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

  // Header + product list (scroll together)
  scrollContent: { paddingBottom: spacing(1) },
  list: { paddingHorizontal: spacing(2.5), paddingTop: spacing(2) },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    padding: spacing(1.25),
    marginBottom: spacing(1.5),
  },
  cardArt: { width: 56, height: 56, borderRadius: 12, overflow: "hidden" },
  cardImg: { width: "100%", height: "100%" },
  cardInfo: { flex: 1, marginLeft: spacing(1.5) },
  cardName: { fontFamily: fonts.bold, fontSize: 15, color: colors.heading },
  cardVariant: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginTop: 1 },
  cardPrice: { fontFamily: fonts.bold, fontSize: 14, color: colors.green, marginTop: 3 },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.green,
    borderRadius: 9,
    paddingHorizontal: 4,
  },
  stepBtn: { width: 26, height: 30, alignItems: "center", justifyContent: "center" },
  stepQty: { fontFamily: fonts.bold, fontSize: 14, color: colors.white, minWidth: 18, textAlign: "center" },

  // Footer
  footer: {
    paddingHorizontal: spacing(2.5),
    paddingTop: spacing(1.5),
    paddingBottom: spacing(1.5),
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
    backgroundColor: colors.bg,
  },
  couponRow: { flexDirection: "row", gap: spacing(1) },
  couponInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.green,
    borderStyle: "dashed",
    borderRadius: 12,
    paddingHorizontal: spacing(1.5),
    height: 48,
  },
  couponInput: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.heading, paddingVertical: 0 },
  applyBtn: {
    backgroundColor: colors.heading,
    borderRadius: 12,
    paddingHorizontal: spacing(2.5),
    alignItems: "center",
    justifyContent: "center",
  },
  applyText: { fontFamily: fonts.bold, fontSize: 14, color: colors.white },

  billHead: {
    fontFamily: fontsAlt.extrabold,
    fontSize: 12,
    letterSpacing: 1,
    color: colors.muted,
    marginTop: spacing(2),
    marginBottom: spacing(1),
  },
  // Bill card — light Ink 100 surface.
  billCard: { backgroundColor: palette.ink[100], borderRadius: 14, padding: spacing(1.75) },
  billRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing(0.5) },
  billLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.heading },
  billValue: { fontFamily: fonts.semibold, fontSize: 14, color: colors.heading },
  billStrong: { fontFamily: fonts.bold, fontSize: 16 },
  billAccent: { color: colors.green },
  couponLabel: { color: colors.green },
  discountValue: { color: colors.green },
  billDivider: { height: 1, backgroundColor: "rgba(37,61,78,0.12)", marginVertical: spacing(1) },

  checkoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.green,
    borderRadius: 14,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(2.5),
    marginTop: spacing(2),
  },
  checkoutText: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },
  checkoutRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkoutTotal: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },
});
