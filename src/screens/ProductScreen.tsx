import { useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useRoute } from "@react-navigation/native";
import {
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  Address,
  ProductDetail,
  Subscription,
  Variant,
  useAddToCartMutation,
  useAddressesQuery,
  useCartQuery,
  useCreateSubscriptionMutation,
  useProductDetailQuery,
  useProductRatingsQuery,
  useRemoveCartItemMutation,
  useSubmitProductRatingMutation,
  useSubscriptionsQuery,
  useUpdateCartItemMutation,
  useUpdateSubscriptionMutation,
} from "../api/baseApi";
import { imageUrl } from "../api/config";
import { Screen } from "../components/Screen";
import { useToast } from "../components/Toast";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useAppSelector } from "../store/hooks";
import { colors, fonts, fontsAlt, spacing } from "../theme";

// Delivery-time presets — the store runs mornings & evenings only. We map a chip
// to a representative TimeField value.
const TIME_SLOTS: { key: string; label: string; sub: string; value: string; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
  { key: "morning", label: "Morning", sub: "6 – 11 AM", value: "07:00:00", icon: "sunny-outline" },
  { key: "evening", label: "Evening", sub: "5 – 9 PM", value: "18:00:00", icon: "moon-outline" },
];

const FREQUENCIES: { key: string; label: string; sub: string }[] = [
  { key: "daily", label: "Daily", sub: "Every day" },
  { key: "alternate", label: "Alternate", sub: "Every other day" },
  { key: "weekdays", label: "Mon–Fri", sub: "Weekdays only" },
];

const PAY_METHODS: { key: string; label: string; sub: string; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
  { key: "wallet", label: "Wallet", sub: "Auto-debit each delivery", icon: "wallet-outline" },
  { key: "cod", label: "Cash on delivery", sub: "Pay the rider", icon: "cash-outline" },
];

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function deriveTimeKey(t?: string | null) {
  if (!t) return "morning";
  return parseInt(t.slice(0, 2), 10) >= 14 ? "evening" : "morning";
}

const BADGE_PINK = "#ff6b81";

function Stars({ value, size = 13 }: { value: number; size?: number }) {
  return (
    <View style={{ flexDirection: "row" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= Math.round(value) ? "star" : "star-outline"}
          size={size}
          color={colors.yellow}
        />
      ))}
    </View>
  );
}

export default function ProductScreen() {
  const { slug } = useRoute<RouteProp<RootStackParamList, "Product">>().params;
  const toast = useToast();
  const { data: cart } = useCartQuery();
  const { data: subscriptions } = useSubscriptionsQuery();
  const [addToCart] = useAddToCartMutation();
  const [updateCartItem] = useUpdateCartItemMutation();
  const [removeCartItem] = useRemoveCartItemMutation();
  const user = useAppSelector((s) => s.auth.user);

  const { data: product, isLoading } = useProductDetailQuery(slug);
  const { data: ratingData } = useProductRatingsQuery(product?.id ?? 0, { skip: !product });
  const [submitRating, { isLoading: submitting }] = useSubmitProductRatingMutation();

  const scrollRef = useRef<ScrollView>(null);
  const [variantId, setVariantId] = useState<number | null>(null);
  const [wished, setWished] = useState(false);
  const [reviewStars, setReviewStars] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [subOpen, setSubOpen] = useState(false);

  const variant =
    product?.variants.find((v) => v.id === variantId) ||
    product?.variants.find((v) => v.is_default) ||
    product?.variants[0];

  // The cart line for the selected variant (shows the stepper when present).
  const cartItem = variant ? cart?.items.find((it) => it.variant === variant.id) : undefined;

  // An existing (non-cancelled) subscription for this variant — drives the
  // "Subscribed + Edit" state instead of "Subscribe & save".
  const existingSub = variant
    ? subscriptions?.find((sub) => sub.variant_id === variant.id && sub.status !== "cancelled")
    : undefined;

  const distribution = useMemo(() => {
    const counts = [0, 0, 0, 0, 0]; // index 0 = 1 star … 4 = 5 stars
    (ratingData?.ratings ?? []).forEach((r) => {
      if (r.rating >= 1 && r.rating <= 5) counts[r.rating - 1]++;
    });
    return counts;
  }, [ratingData]);
  const totalRatings = ratingData?.count ?? product?.rating_count ?? 0;
  const avg = ratingData?.average ?? product?.rating_average ?? 0;

  async function onSubmitReview() {
    if (!product || reviewStars === 0) {
      toast("Pick a star rating first.", "info");
      return;
    }
    try {
      await submitRating({ id: product.id, rating: reviewStars, comment: reviewText.trim() }).unwrap();
      setReviewStars(0);
      setReviewText("");
      toast("Review submitted.");
    } catch {
      toast("Couldn't submit your review.", "error");
    }
  }

  if (isLoading || !product) {
    return (
      <Screen>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.green} />
        </View>
      </Screen>
    );
  }

  const img = imageUrl(product.image_url);
  const price = Number(variant?.price ?? 0);
  const mrp = Number(variant?.mrp ?? 0);
  const discount = variant?.discount_percent ?? 0;

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
      >
        {/* Image with floating actions (no back button, no heart by Add to cart). */}
        <View style={styles.imageWrap}>
          {img ? (
            <Image source={{ uri: img }} style={styles.image} resizeMode="contain" />
          ) : (
            <Text style={styles.imageLabel}>product image</Text>
          )}
          <View style={styles.topActions}>
            <Pressable style={styles.circleBtn} hitSlop={6} onPress={() => toast("Share — coming soon.")}>
              <Ionicons name="share-social-outline" size={18} color={colors.heading} />
            </Pressable>
            <Pressable style={styles.circleBtn} hitSlop={6} onPress={() => setWished((w) => !w)}>
              <Ionicons
                name={wished ? "heart" : "heart-outline"}
                size={18}
                color={wished ? BADGE_PINK : colors.heading}
              />
            </Pressable>
          </View>
          {discount > 0 ? (
            <View style={styles.discount}>
              <Text style={styles.discountText}>{Math.round(discount)}% OFF</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.body}>
          {/* Title block */}
          <Text style={styles.category}>{product.category?.name}</Text>
          <Text style={styles.title}>{product.name}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.brand}>by {product.brand}</Text>
            <Stars value={avg} />
            <Text style={styles.ratingText}>
              {avg.toFixed(1)} ({totalRatings})
            </Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.price}>₹{price.toFixed(2)}</Text>
            {mrp > price ? <Text style={styles.mrp}>₹{mrp.toFixed(2)}</Text> : null}
            {discount > 0 ? (
              <View style={styles.savePill}>
                <Text style={styles.saveText}>SAVE {Math.round(discount)}%</Text>
              </View>
            ) : null}
          </View>

          {/* Variants */}
          <Text style={styles.sectionLabel}>Choose a pack</Text>
          <View style={styles.packRow}>
            {product.variants.map((v) => {
              const active = v.id === (variant?.id ?? -1);
              return (
                <Pressable
                  key={v.id}
                  onPress={() => setVariantId(v.id)}
                  style={[styles.pack, active && styles.packActive]}
                >
                  <Text style={[styles.packLabel, active && styles.packLabelActive]}>{v.label}</Text>
                  <Text style={[styles.packPrice, active && styles.packPriceActive]}>
                    ₹{Number(v.price).toFixed(2)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Actions — full-width Add to cart (no heart), then Subscribe & save */}
          {cartItem ? (
            <View style={styles.cartStepper}>
              <Pressable
                style={styles.cartStepBtn}
                onPress={() =>
                  cartItem.quantity <= 1
                    ? removeCartItem(cartItem.id)
                    : updateCartItem({ item_id: cartItem.id, quantity: cartItem.quantity - 1 })
                }
              >
                <Ionicons name="remove" size={22} color={colors.white} />
              </Pressable>
              <Text style={styles.cartStepQty}>{cartItem.quantity} in cart</Text>
              <Pressable
                style={styles.cartStepBtn}
                onPress={() => variant && addToCart({ variant_id: variant.id })}
              >
                <Ionicons name="add" size={22} color={colors.white} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={styles.addBtn}
              onPress={() => variant && addToCart({ variant_id: variant.id })}
            >
              <Ionicons name="cart-outline" size={18} color={colors.white} />
              <Text style={styles.addText}>Add to cart</Text>
            </Pressable>
          )}
          {existingSub ? (
            <View style={styles.subRow}>
              <View style={styles.subscribedBtn}>
                <Ionicons name="checkmark-circle" size={18} color={colors.green} />
                <Text style={styles.subscribedText}>
                  {existingSub.status === "paused" ? "Subscription paused" : "Subscribed"}
                </Text>
              </View>
              <Pressable style={styles.editBtn} onPress={() => setSubOpen(true)}>
                <Ionicons name="create-outline" size={17} color={colors.heading} />
                <Text style={styles.editText}>Edit</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={styles.subBtn}
              onPress={() => (variant ? setSubOpen(true) : toast("Pick a pack first.", "info"))}
            >
              <Ionicons name="repeat-outline" size={18} color={colors.green} />
              <Text style={styles.subText}>Subscribe & save</Text>
            </Pressable>
          )}

          {/* Ratings & reviews */}
          <Text style={styles.reviewsHead}>Ratings & Reviews</Text>
          <View style={styles.ratingSummary}>
            <View style={styles.avgBox}>
              <Text style={styles.avgNumber}>{avg.toFixed(1)}</Text>
              <Stars value={avg} />
              <Text style={styles.avgCount}>{totalRatings} ratings</Text>
            </View>
            <View style={styles.bars}>
              {[5, 4, 3, 2, 1].map((star) => {
                const count = distribution[star - 1];
                const pct = totalRatings ? (count / totalRatings) * 100 : 0;
                return (
                  <View key={star} style={styles.barRow}>
                    <Text style={styles.barStar}>{star}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${pct}%` }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {(ratingData?.ratings ?? []).map((r) => (
            <View key={r.id} style={styles.review}>
              <View style={styles.reviewAvatar}>
                <Text style={styles.reviewInitial}>
                  {(r.user_name?.[0] || "C").toUpperCase()}
                </Text>
              </View>
              <View style={styles.reviewBody}>
                <Text style={styles.reviewName}>{r.user_name || "Customer"}</Text>
                <Stars value={r.rating} size={11} />
                {r.comment ? <Text style={styles.reviewComment}>{r.comment}</Text> : null}
              </View>
            </View>
          ))}

          {/* Write a review */}
          <Text style={styles.writeHead}>Write a review</Text>
          <View style={styles.starInput}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Pressable key={i} hitSlop={6} onPress={() => setReviewStars(i)}>
                <Ionicons
                  name={i <= reviewStars ? "star" : "star-outline"}
                  size={26}
                  color={colors.yellow}
                />
              </Pressable>
            ))}
          </View>
          <TextInput
            style={styles.reviewInput}
            value={reviewText}
            onChangeText={setReviewText}
            placeholder="Share your experience…"
            placeholderTextColor={colors.muted}
            multiline
            onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 250)}
          />
          <View style={styles.writeFooter}>
            <Text style={styles.postingAs}>Posting as {user?.name || "you"}</Text>
            <Pressable style={styles.submitBtn} onPress={onSubmitReview} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.submitText}>Submit</Text>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      {variant ? (
        <SubscribeSheet
          visible={subOpen}
          onClose={() => setSubOpen(false)}
          product={product}
          variant={variant}
          editing={existingSub}
        />
      ) : null}
    </Screen>
  );
}

function SubscribeSheet({
  visible,
  onClose,
  product,
  variant,
  editing,
}: {
  visible: boolean;
  onClose: () => void;
  product: ProductDetail;
  variant: Variant;
  editing?: Subscription;
}) {
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { data: addresses } = useAddressesQuery();
  const [createSubscription, { isLoading: creating }] = useCreateSubscriptionMutation();
  const [updateSubscription, { isLoading: updating }] = useUpdateSubscriptionMutation();
  const saving = creating || updating;

  const [qty, setQty] = useState(1);
  const [freq, setFreq] = useState("daily");
  const [timeKey, setTimeKey] = useState("morning");
  const [payMethod, setPayMethod] = useState("wallet");
  const [addressId, setAddressId] = useState<number | null>(null);

  const translateY = useRef(new Animated.Value(900)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  // When opening, prefill from the existing subscription (edit) or reset (create).
  useEffect(() => {
    if (!visible) return;
    setQty(editing?.quantity ?? 1);
    setFreq(editing?.frequency ?? "daily");
    setTimeKey(deriveTimeKey(editing?.preferred_time));
    setPayMethod(editing?.payment_method ?? "wallet");
    setAddressId(editing?.address_id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Default the address to the user's default (or first) once they load (create only).
  useEffect(() => {
    if (addressId == null && addresses?.length) {
      setAddressId((addresses.find((a) => a.is_default) ?? addresses[0]).id);
    }
  }, [addresses, addressId]);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(backdrop, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 170 }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(backdrop, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 900, duration: 220, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const img = imageUrl(product.image_url);
  const unit = Number(variant.price);
  const perDelivery = unit * qty;

  async function onSave() {
    if (!addressId) {
      toast("Add a delivery address in your Profile first.", "info");
      return;
    }
    const slot = TIME_SLOTS.find((t) => t.key === timeKey);
    try {
      if (editing) {
        await updateSubscription({
          id: editing.id,
          quantity: qty,
          frequency: freq,
          address_id: addressId,
          preferred_time: slot?.value ?? null,
          payment_method: payMethod,
        }).unwrap();
        toast("Subscription updated.");
      } else {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        await createSubscription({
          variant_id: variant.id,
          quantity: qty,
          frequency: freq,
          address_id: addressId,
          preferred_time: slot?.value ?? null,
          payment_method: payMethod,
          start_date: isoDate(tomorrow),
        }).unwrap();
        toast("Subscribed! Your first delivery arrives tomorrow.");
      }
      onClose();
    } catch (e: any) {
      toast(e?.data?.error || e?.data?.detail || "Couldn't save. Try again.", "error");
    }
  }

  if (!mounted) return null;

  return (
    <Modal transparent visible={mounted} animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[ss.backdrop, { opacity: backdrop }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[ss.sheet, { transform: [{ translateY }], paddingBottom: insets.bottom + spacing(2) }]}>
        <View style={ss.handle} />
        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          {/* Product header */}
          <View style={ss.head}>
            <View style={ss.thumb}>
              {img ? <Image source={{ uri: img }} style={ss.thumbImg} resizeMode="contain" /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={ss.title} numberOfLines={2}>
                {product.name}
              </Text>
              <Text style={ss.sub}>
                {variant.label} · ₹{unit.toFixed(2)}
              </Text>
              <View style={ss.savePill}>
                <Ionicons name="pricetag" size={11} color={colors.green} />
                <Text style={ss.savePillText}>
                  {editing ? "Editing your subscription" : "Save with a subscription"}
                </Text>
              </View>
            </View>
          </View>

          {/* Quantity */}
          <Text style={ss.label}>Quantity per delivery</Text>
          <View style={ss.qtyRow}>
            <Pressable style={ss.qtyBtn} onPress={() => setQty((q) => Math.max(1, q - 1))}>
              <Ionicons name="remove" size={20} color={colors.heading} />
            </Pressable>
            <Text style={ss.qtyValue}>{qty}</Text>
            <Pressable style={ss.qtyBtn} onPress={() => setQty((q) => Math.min(20, q + 1))}>
              <Ionicons name="add" size={20} color={colors.heading} />
            </Pressable>
          </View>

          {/* Frequency */}
          <Text style={ss.label}>How often?</Text>
          <View style={ss.optionRow}>
            {FREQUENCIES.map((f) => {
              const active = freq === f.key;
              return (
                <Pressable key={f.key} style={[ss.option, active && ss.optionActive]} onPress={() => setFreq(f.key)}>
                  <Text style={[ss.optionLabel, active && ss.optionLabelActive]}>{f.label}</Text>
                  <Text style={[ss.optionSub, active && ss.optionSubActive]}>{f.sub}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Preferred time */}
          <Text style={ss.label}>Preferred time</Text>
          <View style={ss.optionRow}>
            {TIME_SLOTS.map((t) => {
              const active = timeKey === t.key;
              return (
                <Pressable key={t.key} style={[ss.option, active && ss.optionActive]} onPress={() => setTimeKey(t.key)}>
                  <Ionicons name={t.icon} size={18} color={active ? colors.green : colors.muted} />
                  <Text style={[ss.optionLabel, active && ss.optionLabelActive, { marginTop: 4 }]}>{t.label}</Text>
                  <Text style={[ss.optionSub, active && ss.optionSubActive]}>{t.sub}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Address */}
          <Text style={ss.label}>Deliver to</Text>
          {addresses?.length ? (
            addresses.map((a: Address) => {
              const active = addressId === a.id;
              return (
                <Pressable key={a.id} style={[ss.addr, active && ss.addrActive]} onPress={() => setAddressId(a.id)}>
                  <Ionicons
                    name={active ? "radio-button-on" : "radio-button-off"}
                    size={18}
                    color={active ? colors.green : colors.muted}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={ss.addrLabel}>{a.label || "Address"}</Text>
                    <Text style={ss.addrText} numberOfLines={1}>
                      {a.address_line}, {a.city}
                    </Text>
                  </View>
                </Pressable>
              );
            })
          ) : (
            <Text style={ss.noAddr}>No saved address. Add one in Profile › Addresses, then subscribe.</Text>
          )}

          {/* Payment method — how each delivery is paid. */}
          <Text style={ss.label}>Pay with</Text>
          {PAY_METHODS.map((p) => {
            const active = payMethod === p.key;
            return (
              <Pressable key={p.key} style={[ss.addr, active && ss.addrActive]} onPress={() => setPayMethod(p.key)}>
                <Ionicons name={p.icon} size={20} color={active ? colors.green : colors.muted} />
                <View style={{ flex: 1 }}>
                  <Text style={ss.addrLabel}>{p.label}</Text>
                  <Text style={ss.addrText}>{p.sub}</Text>
                </View>
                <Ionicons
                  name={active ? "radio-button-on" : "radio-button-off"}
                  size={18}
                  color={active ? colors.green : colors.muted}
                />
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Footer CTA */}
        <View style={ss.footer}>
          <View>
            <Text style={ss.footerLabel}>Per delivery</Text>
            <Text style={ss.footerPrice}>₹{perDelivery.toFixed(2)}</Text>
          </View>
          <Pressable
            style={[ss.cta, (saving || !addresses?.length) && ss.ctaOff]}
            onPress={onSave}
            disabled={saving || !addresses?.length}
          >
            {saving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={ss.ctaText}>{editing ? "Save changes" : "Start subscription"}</Text>
            )}
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { paddingBottom: spacing(4) },

  // Image
  imageWrap: { height: 280, backgroundColor: "#f6efdf", alignItems: "center", justifyContent: "center" },
  image: { width: "100%", height: "100%" },
  imageLabel: { fontFamily: fontsAlt.regular, fontSize: 14, color: "rgba(37,61,78,0.35)" },
  topActions: {
    position: "absolute",
    top: spacing(1.5),
    right: spacing(2),
    flexDirection: "row",
    gap: spacing(1),
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  discount: {
    position: "absolute",
    bottom: spacing(1.5),
    left: spacing(2),
    backgroundColor: BADGE_PINK,
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  discountText: { fontFamily: fonts.bold, fontSize: 12, color: colors.white },

  // Body
  body: { paddingHorizontal: spacing(2.5), paddingTop: spacing(2.5) },
  category: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted },
  title: { fontFamily: fonts.bold, fontSize: 24, color: colors.heading, marginTop: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing(1), marginTop: spacing(0.75) },
  brand: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  ratingText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.text },

  priceRow: { flexDirection: "row", alignItems: "baseline", gap: spacing(1), marginTop: spacing(1.5) },
  price: { fontFamily: fonts.bold, fontSize: 26, color: colors.green },
  mrp: {
    fontFamily: fontsAlt.regular,
    fontSize: 14,
    color: colors.muted,
    textDecorationLine: "line-through",
  },
  savePill: { backgroundColor: colors.greenTint, borderRadius: 6, paddingVertical: 2, paddingHorizontal: 7 },
  saveText: { fontFamily: fonts.bold, fontSize: 11, color: colors.green },

  sectionLabel: { fontFamily: fonts.bold, fontSize: 14, color: colors.heading, marginTop: spacing(2.5), marginBottom: spacing(1) },
  packRow: { flexDirection: "row", gap: spacing(1.5) },
  pack: {
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 12,
    paddingVertical: spacing(1.25),
    paddingHorizontal: spacing(2),
    minWidth: 96,
  },
  packActive: { borderColor: colors.green, backgroundColor: colors.greenTint },
  packLabel: { fontFamily: fonts.bold, fontSize: 15, color: colors.heading },
  packLabelActive: { color: colors.green },
  packPrice: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  packPriceActive: { color: colors.green },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.green,
    borderRadius: 14,
    paddingVertical: spacing(1.75),
    marginTop: spacing(2.5),
  },
  addText: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },
  // In-cart stepper — same full-width footprint as the Add to cart button.
  cartStepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.green,
    borderRadius: 14,
    paddingHorizontal: spacing(1),
    marginTop: spacing(2.5),
  },
  cartStepBtn: { width: 52, height: 52, alignItems: "center", justifyContent: "center" },
  cartStepQty: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },
  subBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.yellow,
    borderRadius: 14,
    paddingVertical: spacing(1.5),
    marginTop: spacing(1.25),
  },
  subText: { fontFamily: fonts.bold, fontSize: 15, color: colors.green },

  // Already-subscribed + Edit row
  subRow: { flexDirection: "row", gap: spacing(1.25), marginTop: spacing(1.25) },
  subscribedBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.greenTint,
    borderRadius: 14,
    paddingVertical: spacing(1.5),
  },
  subscribedText: { fontFamily: fonts.bold, fontSize: 15, color: colors.green },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 14,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(2.5),
  },
  editText: { fontFamily: fonts.bold, fontSize: 15, color: colors.heading },

  // Reviews
  reviewsHead: { fontFamily: fonts.bold, fontSize: 18, color: colors.heading, marginTop: spacing(3.5) },
  ratingSummary: { flexDirection: "row", gap: spacing(2.5), marginTop: spacing(1.5), alignItems: "center" },
  avgBox: { alignItems: "center" },
  avgNumber: { fontFamily: fonts.bold, fontSize: 40, color: colors.heading },
  avgCount: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginTop: 4 },
  bars: { flex: 1, gap: 5 },
  barRow: { flexDirection: "row", alignItems: "center", gap: spacing(1) },
  barStar: { fontFamily: fonts.semibold, fontSize: 12, color: colors.muted, width: 10 },
  barTrack: { flex: 1, height: 7, borderRadius: 4, backgroundColor: colors.lineSoft, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4, backgroundColor: colors.green },

  review: { flexDirection: "row", gap: spacing(1.5), marginTop: spacing(2) },
  reviewAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.heading,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewInitial: { fontFamily: fonts.bold, fontSize: 15, color: colors.white },
  reviewBody: { flex: 1, gap: 3 },
  reviewName: { fontFamily: fonts.bold, fontSize: 14, color: colors.heading },
  reviewComment: { fontFamily: fontsAlt.regular, fontSize: 13, color: colors.text, lineHeight: 19 },

  writeHead: { fontFamily: fonts.bold, fontSize: 15, color: colors.heading, marginTop: spacing(3) },
  starInput: { flexDirection: "row", gap: 6, marginTop: spacing(1) },
  reviewInput: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1.5),
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.heading,
    minHeight: 70,
    textAlignVertical: "top",
    marginTop: spacing(1.25),
  },
  writeFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing(1.5),
  },
  postingAs: { fontFamily: fontsAlt.regular, fontSize: 13, color: colors.muted },
  submitBtn: {
    backgroundColor: colors.green,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 26,
    minWidth: 96,
    alignItems: "center",
  },
  submitText: { fontFamily: fonts.bold, fontSize: 14, color: colors.white },
});

// Subscribe & save bottom sheet
const ss = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(37,61,78,0.5)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "88%",
    backgroundColor: colors.bg,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: spacing(2.5),
    paddingTop: spacing(1.25),
  },
  handle: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: spacing(2) },

  head: { flexDirection: "row", gap: spacing(1.5), marginBottom: spacing(1) },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: "#f6efdf",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbImg: { width: "100%", height: "100%" },
  title: { fontFamily: fonts.bold, fontSize: 17, color: colors.heading },
  sub: { fontFamily: fontsAlt.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  savePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: colors.greenTint,
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginTop: spacing(0.75),
  },
  savePillText: { fontFamily: fonts.bold, fontSize: 11, color: colors.green },

  label: { fontFamily: fonts.bold, fontSize: 14, color: colors.heading, marginTop: spacing(2.25), marginBottom: spacing(1.25) },

  qtyRow: { flexDirection: "row", alignItems: "center", gap: spacing(2.5), alignSelf: "flex-start" },
  qtyBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyValue: { fontFamily: fonts.bold, fontSize: 20, color: colors.heading, minWidth: 28, textAlign: "center" },

  optionRow: { flexDirection: "row", gap: spacing(1) },
  option: {
    flex: 1,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 14,
    paddingVertical: spacing(1.25),
    paddingHorizontal: spacing(0.5),
  },
  optionActive: { borderColor: colors.green, backgroundColor: colors.greenTint },
  optionLabel: { fontFamily: fonts.bold, fontSize: 13.5, color: colors.heading },
  optionLabelActive: { color: colors.green },
  optionSub: { fontFamily: fontsAlt.regular, fontSize: 10.5, color: colors.muted, marginTop: 2, textAlign: "center" },
  optionSubActive: { color: colors.green },

  addr: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.25),
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 14,
    paddingVertical: spacing(1.25),
    paddingHorizontal: spacing(1.5),
    marginBottom: spacing(1),
  },
  addrActive: { borderColor: colors.green, backgroundColor: colors.greenTint },
  addrLabel: { fontFamily: fonts.bold, fontSize: 13, color: colors.heading },
  addrText: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginTop: 1 },
  noAddr: { fontFamily: fontsAlt.regular, fontSize: 13, color: colors.muted, lineHeight: 19 },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
    paddingTop: spacing(1.5),
    marginTop: spacing(1),
  },
  footerLabel: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted },
  footerPrice: { fontFamily: fonts.bold, fontSize: 22, color: colors.heading },
  cta: {
    backgroundColor: colors.green,
    borderRadius: 14,
    paddingVertical: spacing(1.75),
    paddingHorizontal: spacing(3.5),
    alignItems: "center",
    justifyContent: "center",
    minWidth: 170,
  },
  ctaOff: { opacity: 0.55 },
  ctaText: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },
});
