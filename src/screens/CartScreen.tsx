import { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";

import {
  CartItem,
  useAddToCartMutation,
  useApplyCouponMutation,
  useCartQuery,
  useRemoveCartItemMutation,
  useRemoveCouponMutation,
  useUpdateCartItemMutation,
} from "../api/baseApi";
import { imageUrl } from "../api/config";
import { Screen } from "../components/Screen";
import { useToast } from "../components/Toast";
import { colors, fonts, fontsAlt, palette, spacing } from "../theme";

const TINTS = ["#fde2e4", "#e2ecf9", "#e6f5ec", "#f6efdf", "#efe6f7", "#e2f3f5"];
const money = (n: number | string) => "₹" + Number(n).toFixed(2);
const SCREEN_W = Dimensions.get("window").width;

export default function CartScreen() {
  const toast = useToast();
  const { data: cart, isLoading } = useCartQuery();
  const [addToCart] = useAddToCartMutation();
  const [updateCartItem] = useUpdateCartItemMutation();
  const [removeCartItem] = useRemoveCartItemMutation();
  const [applyCoupon, { isLoading: applying }] = useApplyCouponMutation();
  const [removeCoupon] = useRemoveCouponMutation();

  const [code, setCode] = useState("");

  const scrollRef = useRef<ScrollView>(null);

  // Gentle bounce for the "scroll for items" down-arrow hint.
  const bounce = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: 4, duration: 600, useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [bounce]);

  const lines = cart?.items ?? [];
  const bill = cart?.bill;
  const count = cart?.item_count ?? 0;
  const freeDelivery = lines.length > 0 && !!bill && Number(bill.delivery_fee) === 0;

  async function onApplyCoupon() {
    const c = code.trim();
    if (!c) {
      toast("Enter a coupon code.", "info");
      return;
    }
    try {
      await applyCoupon(c).unwrap();
      setCode("");
      toast("Coupon applied.");
    } catch (e: any) {
      toast(e?.data?.error || "Couldn't apply that coupon.", "error");
    }
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

  if (isLoading) {
    return (
      <Screen>
        <View style={styles.empty}>
          <ActivityIndicator size="large" color={colors.green} />
        </View>
      </Screen>
    );
  }

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
            <ScrollView
              ref={scrollRef}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {header}
              <View style={styles.list}>
                {lines.map((l, i) => (
                  <CartCard
                    key={l.id}
                    line={l}
                    tint={TINTS[i % TINTS.length]}
                    onInc={() => addToCart({ variant_id: l.variant, quantity: 1 })}
                    onDec={() =>
                      l.quantity <= 1
                        ? removeCartItem(l.id)
                        : updateCartItem({ item_id: l.id, quantity: l.quantity - 1 })
                    }
                  />
                ))}
              </View>
            </ScrollView>

            {/* Fixed footer: coupon + bill details + checkout. */}
            <View style={styles.footer}>
              <Animated.View style={[styles.scrollHint, { transform: [{ translateY: bounce }] }]}>
                <Pressable
                  style={styles.scrollPill}
                  onPress={() => scrollRef.current?.scrollToEnd({ animated: true })}
                >
                  <Text style={styles.scrollPillText}>Scroll down for more</Text>
                  <Ionicons name="chevron-down" size={15} color={colors.error} />
                </Pressable>
              </Animated.View>

              {cart?.coupon_code ? (
                <View style={styles.couponApplied}>
                  <Ionicons name="pricetag" size={16} color={colors.green} />
                  <Text style={styles.couponAppliedText}>Coupon {cart.coupon_code} applied</Text>
                  <Pressable onPress={() => removeCoupon()} hitSlop={8}>
                    <Text style={styles.couponRemove}>Remove</Text>
                  </Pressable>
                </View>
              ) : (
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
                  <Pressable style={styles.applyBtn} onPress={onApplyCoupon} disabled={applying}>
                    <Text style={styles.applyText}>Apply</Text>
                  </Pressable>
                </View>
              )}

              <Text style={styles.billHead}>BILL DETAILS</Text>
              <View style={styles.billCard}>
                {bill ? (
                  <>
                    {billRow("Subtotal", money(bill.subtotal))}
                    {Number(bill.coupon_discount) > 0
                      ? billRow(`Coupon (${bill.coupon_code})`, "−" + money(bill.coupon_discount))
                      : null}
                    {freeDelivery ? (
                      <View style={[styles.billRow, styles.freeRow]}>
                        <Text style={styles.billLabel}>Delivery</Text>
                        <View style={styles.freeValue}>
                          <Ionicons name="sparkles" size={13} color={colors.green} />
                          <Text style={styles.freeFree}>FREE</Text>
                        </View>
                      </View>
                    ) : (
                      billRow("Delivery", money(bill.delivery_fee))
                    )}
                    {Number(bill.small_cart_fee) > 0 ? billRow("Small-cart fee", money(bill.small_cart_fee)) : null}
                    {billRow("Tax", money(bill.tax))}
                    <View style={styles.billDivider} />
                    {billRow("To Pay", money(bill.grand_total), { strong: true })}
                  </>
                ) : null}
              </View>

              <Pressable style={styles.checkoutBtn} onPress={() => toast("Checkout — coming soon.")}>
                <Text style={styles.checkoutText}>Checkout</Text>
                <View style={styles.checkoutRight}>
                  <Text style={styles.checkoutTotal}>{money(bill?.grand_total ?? 0)}</Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.white} />
                </View>
              </Pressable>
            </View>
          </>
        )}
        {freeDelivery ? (
          <ConfettiCannon
            count={120}
            origin={{ x: SCREEN_W / 2, y: -10 }}
            autoStart
            fadeOut
            explosionSpeed={350}
            fallSpeed={2800}
          />
        ) : null}
      </View>
    </Screen>
  );
}

function CartCard({
  line,
  tint,
  onInc,
  onDec,
}: {
  line: CartItem;
  tint: string;
  onInc: () => void;
  onDec: () => void;
}) {
  const img = imageUrl(line.image_url);
  return (
    <View style={styles.card}>
      <View style={[styles.cardArt, { backgroundColor: tint }]}>
        {img ? <Image source={{ uri: img }} style={styles.cardImg} resizeMode="contain" /> : null}
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={2}>
          {line.product_name}
        </Text>
        {line.variant_label ? <Text style={styles.cardVariant}>{line.variant_label}</Text> : null}
        <Text style={styles.cardPrice}>{money(line.price)}</Text>
      </View>
      <View style={styles.stepper}>
        <Pressable onPress={onDec} hitSlop={6} style={styles.stepBtn}>
          <Ionicons name="remove" size={16} color={colors.white} />
        </Pressable>
        <Text style={styles.stepQty}>{line.quantity}</Text>
        <Pressable onPress={onInc} hitSlop={6} style={styles.stepBtn}>
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
    paddingTop: spacing(1),
    paddingBottom: spacing(1.5),
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
  // Applied coupon — Cream Yolk 400 to draw attention.
  couponApplied: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: palette.yellow[400],
    borderRadius: 12,
    paddingVertical: spacing(1.25),
    paddingHorizontal: spacing(1.5),
  },
  couponAppliedText: { flex: 1, fontFamily: fonts.bold, fontSize: 13, color: colors.heading },
  couponRemove: { fontFamily: fonts.bold, fontSize: 13, color: colors.error },

  // Bouncing pill hint that the list above scrolls.
  scrollHint: { alignItems: "center", paddingBottom: spacing(1) },
  scrollPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.errorTint,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 14,
  },
  scrollPillText: { fontFamily: fonts.bold, fontSize: 12, color: colors.error },

  // Inline free-delivery highlight inside the bill card.
  freeRow: { backgroundColor: colors.greenTint, borderRadius: 8, paddingHorizontal: spacing(1), marginVertical: 1 },
  freeValue: { flexDirection: "row", alignItems: "center", gap: 4 },
  freeFree: { fontFamily: fonts.bold, fontSize: 14, color: colors.green },

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
  // To Pay value — Cream Yolk 400.
  billAccent: { color: palette.yellow[400] },
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
