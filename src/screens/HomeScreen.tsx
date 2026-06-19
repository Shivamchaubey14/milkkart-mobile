import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  CatalogProduct,
  useAddToCartMutation,
  useBannersQuery,
  useCartQuery,
  useCategoriesQuery,
  useProductsQuery,
  useRemoveCartItemMutation,
  useUpdateCartItemMutation,
} from "../api/baseApi";
import { imageUrl } from "../api/config";
import { BannerCarousel } from "../components/BannerCarousel";
import { Screen } from "../components/Screen";
import { SearchBar } from "../components/SearchBar";
import { useToast } from "../components/Toast";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useAppSelector } from "../store/hooks";
import { colors, fonts, fontsAlt, spacing } from "../theme";

const BADGE_PINK = "#ff6b81";

// Pastel placeholder backgrounds, assigned per card by index (product images
// are served by the web, not the backend, so the grid uses tints for now).
const TINTS = ["#fde2e4", "#e2ecf9", "#e6f5ec", "#f6efdf", "#efe6f7", "#e2f3f5"];

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useAppSelector((s) => s.auth.user);
  const initial = (user?.name?.trim()?.[0] || "A").toUpperCase();
  const { data: banners } = useBannersQuery();
  const { data: categories } = useCategoriesQuery();

  // null = "All"; otherwise a category id used to filter the product query.
  const [activeCatId, setActiveCatId] = useState<number | null>(null);
  const catChips = [{ id: null as number | null, name: "All" }, ...(categories ?? [])];

  // Search box (debounced so we don't hit the API on every keystroke).
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(id);
  }, [search]);

  // Search takes priority over the category filter while there's a query.
  const productArg = query
    ? { search: query }
    : activeCatId
      ? { category: activeCatId }
      : undefined;
  const { data: products, isFetching } = useProductsQuery(productArg);

  const toast = useToast();
  const { data: cart } = useCartQuery();
  const [addToCart] = useAddToCartMutation();
  const [updateCartItem] = useUpdateCartItemMutation();
  const [removeCartItem] = useRemoveCartItemMutation();
  const [wishlist, setWishlist] = useState<Record<number, boolean>>({});

  // Cart line for a product, keyed by its default variant id.
  const lineFor = (p: CatalogProduct) =>
    cart?.items.find((it) => it.variant === p.default_variant?.id);

  async function add(p: CatalogProduct) {
    const variantId = p.default_variant?.id;
    if (!variantId) return;
    try {
      await addToCart({ variant_id: variantId }).unwrap();
    } catch {
      toast("Couldn't add to cart.", "error");
    }
  }
  async function dec(p: CatalogProduct) {
    const line = lineFor(p);
    if (!line) return;
    if (line.quantity <= 1) removeCartItem(line.id);
    else updateCartItem({ item_id: line.id, quantity: line.quantity - 1 });
  }
  const toggleWish = (id: number) => setWishlist((w) => ({ ...w, [id]: !w[id] }));

  return (
    <Screen padded={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Dark header — deliver-to, avatar, search. */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.deliverLabel}>DELIVER TO</Text>
              <View style={styles.deliverRow}>
                <Text style={styles.deliverValue}>Home · 12 min</Text>
                <Ionicons name="chevron-down" size={16} color={colors.white} />
              </View>
            </View>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
          </View>

          <View style={styles.searchWrap}>
            <SearchBar onChangeText={setSearch} />
          </View>
        </View>

        <View style={styles.content}>
          {/* Promo banners — live from the backend, with a static fallback while loading. */}
          {banners && banners.length > 0 ? (
            <BannerCarousel banners={banners} />
          ) : (
            <View style={styles.banner}>
              <View style={styles.bannerLeft}>
                <Text style={styles.bannerTitle}>30% off{"\n"}fresh fruit</Text>
                <Pressable style={styles.bannerBtn}>
                  <Text style={styles.bannerBtnText}>Shop now</Text>
                </Pressable>
              </View>
              <View style={styles.bannerArt} />
            </View>
          )}

          {/* Categories */}
          <Text style={styles.sectionTitle}>Categories</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            {catChips.map((c) => {
              const active = c.id === activeCatId;
              return (
                <Pressable
                  key={c.id ?? "all"}
                  onPress={() => setActiveCatId(c.id)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Popular products / search results */}
          <Text style={styles.sectionTitle}>
            {query ? `Results for “${query}”` : "Popular Products"}
          </Text>
          {!products && isFetching ? (
            <ActivityIndicator color={colors.green} style={{ marginTop: spacing(3) }} />
          ) : products && products.length === 0 ? (
            <Text style={styles.empty}>
              {query ? `No products match “${query}”.` : "No products in this category yet."}
            </Text>
          ) : (
            <View style={[styles.grid, isFetching && styles.gridFetching]}>
              {products?.map((p, i) => {
                const v = p.default_variant;
                const price = Number(v?.price ?? 0);
                const mrp = Number(v?.mrp ?? 0);
                const discount = v?.discount_percent ?? 0;
                const qty = lineFor(p)?.quantity || 0;
                const wished = !!wishlist[p.id];
                const img = imageUrl(p.image_url);
                return (
                  <Pressable
                    key={p.id}
                    style={styles.card}
                    onPress={() => navigation.navigate("Product", { slug: p.slug })}
                  >
                    <View style={[styles.cardArt, { backgroundColor: TINTS[i % TINTS.length] }]}>
                      {img ? (
                        <Image source={{ uri: img }} style={styles.cardImg} resizeMode="contain" />
                      ) : (
                        <Text style={styles.artLabel}>product</Text>
                      )}
                      {discount > 0 ? (
                        <View style={styles.discount}>
                          <Text style={styles.discountText}>{Math.round(discount)}% OFF</Text>
                        </View>
                      ) : null}
                      <Pressable style={styles.heart} onPress={() => toggleWish(p.id)} hitSlop={8}>
                        <Ionicons
                          name={wished ? "heart" : "heart-outline"}
                          size={16}
                          color={wished ? BADGE_PINK : colors.muted}
                        />
                      </Pressable>
                    </View>

                    <View style={styles.cardBody}>
                      <Text style={styles.cardCat} numberOfLines={1}>
                        {p.category_name}
                      </Text>
                      <Text style={styles.cardName} numberOfLines={2}>
                        {p.name}
                      </Text>

                      <View style={styles.ratingRow}>
                        {p.rating_count > 0 ? (
                          <>
                            <Ionicons name="star" size={12} color={colors.yellow} />
                            <Text style={styles.ratingText}>
                              {p.rating_average.toFixed(1)} ({p.rating_count})
                            </Text>
                          </>
                        ) : (
                          <Text style={styles.noRating}>No ratings yet</Text>
                        )}
                      </View>

                      <View style={styles.priceRow}>
                        <View style={styles.priceLeft}>
                          <Text style={styles.price}>₹{price.toFixed(2)}</Text>
                          {mrp > price ? <Text style={styles.mrp}>₹{mrp.toFixed(2)}</Text> : null}
                        </View>

                        {qty > 0 ? (
                          <View style={styles.stepper}>
                            <Pressable onPress={() => dec(p)} hitSlop={6} style={styles.stepBtn}>
                              <Ionicons name="remove" size={16} color={colors.white} />
                            </Pressable>
                            <Text style={styles.stepQty}>{qty}</Text>
                            <Pressable onPress={() => add(p)} hitSlop={6} style={styles.stepBtn}>
                              <Ionicons name="add" size={16} color={colors.white} />
                            </Pressable>
                          </View>
                        ) : (
                          <Pressable onPress={() => add(p)} style={styles.addBtn}>
                            <Ionicons name="cart-outline" size={14} color={colors.green} />
                            <Text style={styles.addText}>Add</Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing(3) },

  // Header -------------------------------------------------------------------
  header: {
    backgroundColor: colors.heading,
    borderRadius: 26,
    marginHorizontal: spacing(2.5),
    marginTop: spacing(1),
    paddingHorizontal: spacing(2),
    paddingTop: spacing(2),
    paddingBottom: spacing(2.5),
  },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  deliverLabel: { fontFamily: fontsAlt.extrabold, fontSize: 10, letterSpacing: 1, color: colors.green },
  deliverRow: { flexDirection: "row", alignItems: "center", marginTop: 3 },
  deliverValue: { fontFamily: fonts.bold, fontSize: 16, color: colors.white, marginRight: 4 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },
  searchWrap: { marginTop: spacing(2) },

  // Content ------------------------------------------------------------------
  content: { paddingHorizontal: spacing(2.5), paddingTop: spacing(2.5) },

  banner: {
    flexDirection: "row",
    backgroundColor: colors.yellow,
    borderRadius: 18,
    padding: spacing(2.5),
    overflow: "hidden",
  },
  bannerLeft: { flex: 1 },
  bannerTitle: { fontFamily: fonts.bold, fontSize: 22, color: colors.heading, lineHeight: 27 },
  bannerBtn: {
    alignSelf: "flex-start",
    backgroundColor: colors.heading,
    borderRadius: 10,
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(2),
    marginTop: spacing(1.5),
  },
  bannerBtnText: { fontFamily: fonts.bold, fontSize: 13, color: colors.white },
  bannerArt: {
    width: 88,
    height: 88,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.45)",
    alignSelf: "center",
  },

  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.heading,
    marginTop: spacing(3),
    marginBottom: spacing(1.5),
  },

  // Category chips
  chips: { gap: spacing(1), paddingRight: spacing(2.5) },
  chip: {
    paddingVertical: spacing(0.75),
    paddingHorizontal: spacing(2),
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  chipActive: { backgroundColor: colors.green, borderColor: colors.green },
  chipText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.heading },
  chipTextActive: { color: colors.white },

  // Product grid
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  gridFetching: { opacity: 0.5 },
  empty: { fontFamily: fontsAlt.regular, fontSize: 14, color: colors.muted, marginTop: spacing(2) },
  card: {
    width: "48.5%",
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    marginBottom: spacing(2),
    overflow: "hidden",
  },
  cardArt: { height: 104, alignItems: "center", justifyContent: "center" },
  cardImg: { width: "100%", height: "100%" },
  artLabel: { fontFamily: fontsAlt.regular, fontSize: 12, color: "rgba(37,61,78,0.35)" },
  discount: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: BADGE_PINK,
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  discountText: { fontFamily: fonts.bold, fontSize: 10, color: colors.white },
  heart: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { padding: spacing(1.25) },
  cardCat: { fontFamily: fontsAlt.regular, fontSize: 11, color: colors.muted },
  cardName: { fontFamily: fonts.bold, fontSize: 14, color: colors.heading, marginTop: 2 },
  ratingRow: { flexDirection: "row", alignItems: "center", marginTop: 4, minHeight: 16 },
  ratingText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.text, marginLeft: 3 },
  noRating: { fontFamily: fontsAlt.regular, fontSize: 11, color: colors.muted },
  priceRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: spacing(1) },
  // Price stacked: current price on top, struck MRP below — keeps the row
  // narrow so the Add button never gets pushed against the card edge.
  priceLeft: { flexShrink: 1 },
  price: { fontFamily: fonts.bold, fontSize: 15, color: colors.green },
  mrp: {
    fontFamily: fontsAlt.regular,
    fontSize: 11,
    color: colors.muted,
    textDecorationLine: "line-through",
    marginTop: 1,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.greenTint,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 9,
    marginLeft: spacing(0.75),
  },
  addText: { fontFamily: fonts.bold, fontSize: 12, color: colors.green, marginLeft: 2 },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.green,
    borderRadius: 8,
    paddingHorizontal: 4,
    marginLeft: spacing(0.75),
  },
  stepBtn: { width: 24, height: 28, alignItems: "center", justifyContent: "center" },
  stepQty: { fontFamily: fonts.bold, fontSize: 13, color: colors.white, minWidth: 16, textAlign: "center" },
});
