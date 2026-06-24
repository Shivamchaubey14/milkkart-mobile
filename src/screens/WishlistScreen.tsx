import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  useAddToCartMutation,
  useCartQuery,
  useRemoveCartItemMutation,
  useUpdateCartItemMutation,
} from "../api/baseApi";
import { imageUrl } from "../api/config";
import { Screen } from "../components/Screen";
import { useToast } from "../components/Toast";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { removeWishlist } from "../store/wishlistSlice";
import { colors, fonts, fontsAlt, spacing } from "../theme";

const TINTS = ["#fde2e4", "#e2ecf9", "#e6f5ec", "#f6efdf", "#efe6f7", "#e2f3f5"];

export default function WishlistScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const toast = useToast();
  const items = useAppSelector((s) => s.wishlist.items);
  const dispatch = useAppDispatch();
  const { data: cart, isFetching, refetch } = useCartQuery();
  const [addToCart] = useAddToCartMutation();
  const [updateCartItem] = useUpdateCartItemMutation();
  const [removeCartItem] = useRemoveCartItemMutation();

  const lineFor = (variantId?: number) =>
    variantId ? cart?.items.find((it) => it.variant === variantId) : undefined;

  async function add(variantId?: number) {
    if (!variantId) {
      toast("Open the product to choose a pack.", "info");
      return;
    }
    try {
      await addToCart({ variant_id: variantId }).unwrap();
    } catch {
      toast("Couldn't add to cart.", "error");
    }
  }

  return (
    <Screen padded={false}>
      <View style={styles.flex}>
        <View style={styles.header}>
          <View style={styles.blob} />
          <Text style={styles.headerTitle}>Wishlist</Text>
          <Text style={styles.headerSub}>
            {items.length ? `${items.length} saved item${items.length > 1 ? "s" : ""}` : "Save what you love"}
          </Text>
        </View>

        {items.length === 0 ? (
          <View style={styles.center}>
            <View style={styles.emptyBadge}>
              <Ionicons name="heart-outline" size={34} color={colors.green} />
            </View>
            <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
            <Text style={styles.emptySub}>Tap the heart on any product to save it here.</Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.green} colors={[colors.green]} />
            }
          >
            {items.map((it, i) => {
              const img = imageUrl(it.image_url);
              const line = lineFor(it.variant_id);
              return (
                <Pressable
                  key={it.slug}
                  style={styles.card}
                  onPress={() => navigation.navigate("Product", { slug: it.slug })}
                >
                  <View style={[styles.thumb, { backgroundColor: TINTS[i % TINTS.length] }]}>
                    {img ? <Image source={{ uri: img }} style={styles.thumbImg} resizeMode="contain" /> : null}
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={2}>
                      {it.name}
                    </Text>
                    <Text style={styles.price}>₹{Number(it.price).toFixed(2)}</Text>
                  </View>
                  <View style={styles.actions}>
                    {line ? (
                      <View style={styles.stepper}>
                        <Pressable
                          style={styles.stepBtn}
                          onPress={() =>
                            line.quantity <= 1
                              ? removeCartItem(line.id)
                              : updateCartItem({ item_id: line.id, quantity: line.quantity - 1 })
                          }
                          hitSlop={4}
                        >
                          <Ionicons name="remove" size={16} color={colors.white} />
                        </Pressable>
                        <Text style={styles.stepQty}>{line.quantity}</Text>
                        <Pressable style={styles.stepBtn} onPress={() => add(it.variant_id)} hitSlop={4}>
                          <Ionicons name="add" size={16} color={colors.white} />
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable style={styles.addBtn} onPress={() => add(it.variant_id)}>
                        <Ionicons name="cart-outline" size={15} color={colors.white} />
                        <Text style={styles.addText}>Add</Text>
                      </Pressable>
                    )}
                    <Pressable style={styles.removePill} onPress={() => dispatch(removeWishlist(it.slug))} hitSlop={4}>
                      <Ionicons name="heart-dislike-outline" size={13} color={colors.error} />
                      <Text style={styles.removeText}>Remove</Text>
                    </Pressable>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing(4) },

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
    backgroundColor: "rgba(255,107,129,0.18)",
  },
  headerTitle: { fontFamily: fonts.bold, fontSize: 22, color: colors.white },
  headerSub: { fontFamily: fontsAlt.regular, fontSize: 13, color: colors.green, marginTop: 3 },

  list: { paddingHorizontal: spacing(2.5), paddingTop: spacing(2), paddingBottom: spacing(3) },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    padding: spacing(1.5),
    marginBottom: spacing(1.25),
  },
  thumb: { width: 60, height: 60, borderRadius: 12, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  thumbImg: { width: "100%", height: "100%" },
  info: { flex: 1, marginLeft: spacing(1.5) },
  name: { fontFamily: fonts.bold, fontSize: 14, color: colors.heading },
  price: { fontFamily: fonts.bold, fontSize: 15, color: colors.green, marginTop: 4 },
  actions: { alignItems: "flex-end", gap: spacing(1) },
  // Add → stepper swap (matches Home / web).
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: colors.green,
    borderRadius: 999,
    paddingVertical: spacing(0.75),
    paddingHorizontal: spacing(1.75),
    minWidth: 92,
  },
  addText: { fontFamily: fonts.bold, fontSize: 13, color: colors.white },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.green,
    borderRadius: 999,
    paddingHorizontal: spacing(0.5),
    minWidth: 92,
  },
  stepBtn: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  stepQty: { fontFamily: fonts.bold, fontSize: 14, color: colors.white, minWidth: 18, textAlign: "center" },
  // Pill-shaped remove.
  removePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.errorTint,
    borderRadius: 999,
    paddingVertical: spacing(0.6),
    paddingHorizontal: spacing(1.25),
  },
  removeText: { fontFamily: fonts.bold, fontSize: 12, color: colors.error },

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
  emptySub: { fontFamily: fontsAlt.regular, fontSize: 14, color: colors.muted, marginTop: spacing(0.5), textAlign: "center" },
});
