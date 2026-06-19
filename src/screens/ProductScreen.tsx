import { useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useRoute } from "@react-navigation/native";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  useAddToCartMutation,
  useProductDetailQuery,
  useProductRatingsQuery,
  useSubmitProductRatingMutation,
} from "../api/baseApi";
import { imageUrl } from "../api/config";
import { Screen } from "../components/Screen";
import { useToast } from "../components/Toast";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useAppSelector } from "../store/hooks";
import { colors, fonts, fontsAlt, spacing } from "../theme";

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
  const [addToCart] = useAddToCartMutation();
  const user = useAppSelector((s) => s.auth.user);

  const { data: product, isLoading } = useProductDetailQuery(slug);
  const { data: ratingData } = useProductRatingsQuery(product?.id ?? 0, { skip: !product });
  const [submitRating, { isLoading: submitting }] = useSubmitProductRatingMutation();

  const scrollRef = useRef<ScrollView>(null);
  const [variantId, setVariantId] = useState<number | null>(null);
  const [wished, setWished] = useState(false);
  const [reviewStars, setReviewStars] = useState(0);
  const [reviewText, setReviewText] = useState("");

  const variant =
    product?.variants.find((v) => v.id === variantId) ||
    product?.variants.find((v) => v.is_default) ||
    product?.variants[0];

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
          <Pressable
            style={styles.addBtn}
            onPress={async () => {
              if (!variant) return;
              try {
                await addToCart({ variant_id: variant.id }).unwrap();
                toast("Added to cart.");
              } catch {
                toast("Couldn't add to cart.", "error");
              }
            }}
          >
            <Ionicons name="cart-outline" size={18} color={colors.white} />
            <Text style={styles.addText}>Add to cart</Text>
          </Pressable>
          <Pressable style={styles.subBtn} onPress={() => toast("Subscribe & save — coming soon.")}>
            <Ionicons name="repeat-outline" size={18} color={colors.green} />
            <Text style={styles.subText}>Subscribe & save</Text>
          </Pressable>

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
    </Screen>
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
