import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useBannersQuery } from "../api/baseApi";
import { BannerCarousel } from "../components/BannerCarousel";
import { Screen } from "../components/Screen";
import { SearchBar } from "../components/SearchBar";
import { useAppSelector } from "../store/hooks";
import { colors, fonts, fontsAlt, spacing } from "../theme";

const BADGE_PINK = "#ff6b81";

const CATEGORIES = ["All", "Milk", "Curd & Yogurt", "Paneer & Cheese", "Bread & Bakery"];

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  mrp?: number;
  discount?: number;
  rating?: number;
  ratingCount?: number;
  tint: string;
  qty?: number; // demo: a non-zero qty shows the stepper instead of "Add"
  wishlisted?: boolean;
};

const PRODUCTS: Product[] = [
  { id: "1", name: "Brown Bread", category: "Bread & Bakery", price: 45, mrp: 49, discount: 9, rating: 5.0, ratingCount: 4, tint: "#fde2e4" },
  { id: "2", name: "Sandwich Bread", category: "Bread & Bakery", price: 40, mrp: 43, discount: 8, tint: "#e2ecf9", qty: 1 },
  { id: "3", name: "Full Cream Milk 1L", category: "Milk", price: 56, mrp: 61, discount: 9, rating: 4.6, ratingCount: 24, tint: "#fde2e4", wishlisted: true },
  { id: "4", name: "Fresh Paneer 200g", category: "Paneer & Cheese", price: 90, rating: 4.7, ratingCount: 12, tint: "#f6efdf" },
];

export default function HomeScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const initial = (user?.name?.trim()?.[0] || "A").toUpperCase();
  const { data: banners } = useBannersQuery();

  const [activeCat, setActiveCat] = useState("All");
  const [cart, setCart] = useState<Record<string, number>>(
    Object.fromEntries(PRODUCTS.filter((p) => p.qty).map((p) => [p.id, p.qty as number])),
  );
  const [wishlist, setWishlist] = useState<Record<string, boolean>>(
    Object.fromEntries(PRODUCTS.filter((p) => p.wishlisted).map((p) => [p.id, true])),
  );

  const inc = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const dec = (id: string) =>
    setCart((c) => {
      const next = (c[id] || 0) - 1;
      const copy = { ...c };
      if (next <= 0) delete copy[id];
      else copy[id] = next;
      return copy;
    });
  const toggleWish = (id: string) => setWishlist((w) => ({ ...w, [id]: !w[id] }));

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
            <SearchBar />
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
            {CATEGORIES.map((c) => {
              const active = c === activeCat;
              return (
                <Pressable
                  key={c}
                  onPress={() => setActiveCat(c)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Popular products */}
          <Text style={styles.sectionTitle}>Popular Products</Text>
          <View style={styles.grid}>
            {PRODUCTS.map((p) => {
              const qty = cart[p.id] || 0;
              const wished = !!wishlist[p.id];
              return (
                <View key={p.id} style={styles.card}>
                  <View style={[styles.cardArt, { backgroundColor: p.tint }]}>
                    {p.discount ? (
                      <View style={styles.discount}>
                        <Text style={styles.discountText}>{p.discount}% OFF</Text>
                      </View>
                    ) : null}
                    <Pressable style={styles.heart} onPress={() => toggleWish(p.id)} hitSlop={8}>
                      <Ionicons
                        name={wished ? "heart" : "heart-outline"}
                        size={16}
                        color={wished ? BADGE_PINK : colors.muted}
                      />
                    </Pressable>
                    <Text style={styles.artLabel}>product</Text>
                  </View>

                  <View style={styles.cardBody}>
                    <Text style={styles.cardCat}>{p.category}</Text>
                    <Text style={styles.cardName} numberOfLines={1}>
                      {p.name}
                    </Text>

                    <View style={styles.ratingRow}>
                      {p.rating ? (
                        <>
                          <Ionicons name="star" size={12} color={colors.yellow} />
                          <Text style={styles.ratingText}>
                            {p.rating.toFixed(1)} ({p.ratingCount})
                          </Text>
                        </>
                      ) : (
                        <Text style={styles.noRating}>No ratings yet</Text>
                      )}
                    </View>

                    <View style={styles.priceRow}>
                      <View style={styles.priceLeft}>
                        <Text style={styles.price}>₹{p.price.toFixed(2)}</Text>
                        {p.mrp ? <Text style={styles.mrp}>₹{p.mrp.toFixed(2)}</Text> : null}
                      </View>

                      {qty > 0 ? (
                        <View style={styles.stepper}>
                          <Pressable onPress={() => dec(p.id)} hitSlop={6} style={styles.stepBtn}>
                            <Ionicons name="remove" size={16} color={colors.white} />
                          </Pressable>
                          <Text style={styles.stepQty}>{qty}</Text>
                          <Pressable onPress={() => inc(p.id)} hitSlop={6} style={styles.stepBtn}>
                            <Ionicons name="add" size={16} color={colors.white} />
                          </Pressable>
                        </View>
                      ) : (
                        <Pressable onPress={() => inc(p.id)} style={styles.addBtn}>
                          <Ionicons name="add" size={14} color={colors.green} />
                          <Text style={styles.addText}>Add</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
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
  priceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing(1) },
  priceLeft: { flexDirection: "row", alignItems: "baseline" },
  price: { fontFamily: fonts.bold, fontSize: 15, color: colors.green },
  mrp: {
    fontFamily: fontsAlt.regular,
    fontSize: 11,
    color: colors.muted,
    textDecorationLine: "line-through",
    marginLeft: 4,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.greenTint,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 9,
  },
  addText: { fontFamily: fonts.bold, fontSize: 12, color: colors.green, marginLeft: 2 },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.green,
    borderRadius: 8,
    paddingHorizontal: 4,
  },
  stepBtn: { width: 24, height: 28, alignItems: "center", justifyContent: "center" },
  stepQty: { fontFamily: fonts.bold, fontSize: 13, color: colors.white, minWidth: 16, textAlign: "center" },
});
