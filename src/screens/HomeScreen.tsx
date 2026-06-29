import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  CatalogProduct,
  useAddToCartMutation,
  useBannersQuery,
  useCartQuery,
  useCategoriesQuery,
  useOrderWindowQuery,
  useProductsQuery,
  useRemoveCartItemMutation,
  useUpdateCartItemMutation,
} from "../api/baseApi";
import { imageUrl } from "../api/config";
import { BannerCarousel } from "../components/BannerCarousel";
import { Screen } from "../components/Screen";
import { ProductGridSkeleton, Skeleton } from "../components/Skeleton";
import { SearchBar } from "../components/SearchBar";
import { useToast } from "../components/Toast";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { toggleWishlist } from "../store/wishlistSlice";
import { colors, fonts, fontsAlt, spacing } from "../theme";

const BADGE_PINK = "#ff6b81";

// Pastel placeholder backgrounds, assigned per card by index (product images
// are served by the web, not the backend, so the grid uses tints for now).
const TINTS = ["#fde2e4", "#e2ecf9", "#e6f5ec", "#f6efdf", "#efe6f7", "#e2f3f5"];

// "HH:MM" → "10 AM" / "6:30 PM" for the pre-order strip.
function fmtClock(t: string) {
  const [hh, mm] = t.split(":");
  let h = parseInt(hh, 10);
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return mm && mm !== "00" ? `${h}:${mm} ${ap}` : `${h} ${ap}`;
}

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useAppSelector((s) => s.auth.user);
  const initial = (user?.name?.trim()?.[0] || "A").toUpperCase();
  const { data: banners, refetch: refetchBanners } = useBannersQuery();
  const { data: categories, refetch: refetchCategories } = useCategoriesQuery();
  const { data: orderWindow, refetch: refetchWindow } = useOrderWindowQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

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
  const { data: products, isFetching, refetch: refetchProducts } = useProductsQuery(productArg);

  const toast = useToast();
  const { data: cart, refetch: refetchCart } = useCartQuery();

  const onRefresh = () => {
    refetchProducts();
    refetchCategories();
    refetchBanners();
    refetchCart();
    refetchWindow();
  };
  const [addToCart] = useAddToCartMutation();
  const [updateCartItem] = useUpdateCartItemMutation();
  const [removeCartItem] = useRemoveCartItemMutation();
  const dispatch = useAppDispatch();
  const wishedItems = useAppSelector((s) => s.wishlist.items);

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
  const isWished = (slug: string) => wishedItems.some((i) => i.slug === slug);
  function toggleWish(p: CatalogProduct) {
    dispatch(
      toggleWishlist({
        slug: p.slug,
        name: p.name,
        image_url: p.image_url,
        price: p.default_variant?.price ?? "0",
        variant_id: p.default_variant?.id,
      }),
    );
  }

  return (
    <Screen padded={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={onRefresh} tintColor={colors.green} colors={[colors.green]} />
        }
      >
        {/* Dark header — brand logo, avatar, search. */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            {/* Brand logo on a light chip so the dark wordmark stays visible on
                the dark header. */}
            <View style={styles.logoChip}>
              <Image source={require("../assets/milkkart-logo.png")} style={styles.logo} resizeMode="contain" />
            </View>
            <Pressable
              onPress={() =>
                navigation.navigate("Main", {
                  screen: "Profile",
                  params: { screen: "ProfileHome" },
                } as never)
              }
              style={styles.avatar}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Open profile"
            >
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarText}>{initial}</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.searchWrap}>
            <SearchBar onChangeText={setSearch} />
          </View>
        </View>

        <View style={styles.content}>
          {/* Next-day pre-order window — nudges customers to order before it closes. */}
          {orderWindow?.enabled && orderWindow.open ? (
            <View style={styles.preorder}>
              <Ionicons name="sunny-outline" size={18} color="#d64a4a" />
              <Text style={styles.preorderText}>
                Pre-order for tomorrow — order before {fmtClock(orderWindow.end)}
              </Text>
            </View>
          ) : null}

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
            {!categories ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} width={72} height={34} radius={999} />
              ))
            ) : (
              catChips.map((c) => {
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
              })
            )}
          </ScrollView>

          {/* Popular products / search results */}
          <Text style={styles.sectionTitle}>
            {query ? `Results for “${query}”` : "Popular Products"}
          </Text>
          {!products && isFetching ? (
            <ProductGridSkeleton />
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
                const wished = isWished(p.slug);
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
                      <Pressable style={styles.heart} onPress={() => toggleWish(p)} hitSlop={8}>
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
  logoChip: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: spacing(1.25),
    paddingVertical: spacing(0.75),
  },
  logo: { width: 88, height: 34 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  avatarText: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },
  avatarImg: { width: "100%", height: "100%" },
  searchWrap: { marginTop: spacing(2) },

  // Content ------------------------------------------------------------------
  content: { paddingHorizontal: spacing(2.5), paddingTop: spacing(2.5) },

  preorder: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1),
    backgroundColor: "#fdeaea",
    borderWidth: 1,
    borderColor: "#f3b6b6",
    borderRadius: 12,
    paddingVertical: spacing(1.25),
    paddingHorizontal: spacing(1.75),
    marginBottom: spacing(2),
  },
  preorderText: { flex: 1, fontFamily: fonts.semibold, fontSize: 12.5, lineHeight: 17, color: "#b23b3b" },

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
