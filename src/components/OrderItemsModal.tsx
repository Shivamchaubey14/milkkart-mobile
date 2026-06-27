import { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Animated, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RiderDelivery } from "../api/baseApi";
import { imageUrl } from "../api/config";
import { useT } from "../i18n/LanguageProvider";
import { colors, fonts, fontsAlt, spacing } from "../theme";

const TINTS = ["#e2ecf9", "#e6f5ec", "#fde2e4", "#f6efdf", "#efe6f7", "#e2f3f5"];

// Bottom-sheet listing an order's products + quantities so the rider can see
// what's in the order. Same slide-up + fade pattern as the other sheets.
export function OrderItemsModal({ delivery, onClose }: { delivery: RiderDelivery | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const t = useT();
  const visible = !!delivery;
  const translateY = useRef(new Animated.Value(700)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);
  // Keep the last delivery during the exit animation so content doesn't vanish.
  const [data, setData] = useState<RiderDelivery | null>(delivery);

  useEffect(() => {
    if (delivery) setData(delivery);
  }, [delivery]);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(backdrop, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 160 }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(backdrop, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 700, duration: 220, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!mounted) return null;

  const items = data?.items ?? [];
  const count = data?.item_count ?? items.length;
  const custAvatar = imageUrl(data?.customer_avatar);
  const custName = (data?.customer_name || "").trim();
  const custInitial = (custName || data?.customer_phone || "?").trim()[0]?.toUpperCase() ?? "?";

  return (
    <Modal transparent visible={mounted} onRequestClose={onClose} animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.sheet, { transform: [{ translateY }], paddingBottom: insets.bottom + spacing(2) }]}>
        <View style={styles.handle} />

        <View style={styles.head}>
          <View style={styles.flex}>
            <Text style={styles.title}>{t("orderItems")}</Text>
            {data ? (
              <Text style={styles.sub}>
                #{data.order_number.slice(0, 8)} · {count} {count === 1 ? t("itemSingular") : t("itemPlural")}
              </Text>
            ) : null}
          </View>
          <Pressable style={styles.close} onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={18} color={colors.heading} />
          </Pressable>
        </View>

        {/* Who ordered — customer avatar, name and a quick call action. */}
        {data && (custName || data.customer_phone) ? (
          <View style={styles.customer}>
            <View style={styles.custAvatar}>
              {custAvatar ? (
                <Image source={{ uri: custAvatar }} style={styles.custAvatarImg} />
              ) : (
                <Text style={styles.custInitial}>{custInitial}</Text>
              )}
            </View>
            <View style={styles.flex}>
              <Text style={styles.custName} numberOfLines={1}>{custName || t("customer")}</Text>
              {data.customer_phone ? (
                <View style={styles.custPhoneRow}>
                  <Ionicons name="call-outline" size={12} color={colors.muted} />
                  <Text style={styles.custPhone} numberOfLines={1}>{data.customer_phone}</Text>
                </View>
              ) : null}
            </View>
            {data.customer_phone ? (
              <Pressable style={styles.custCall} onPress={() => Linking.openURL(`tel:${data.customer_phone}`)} hitSlop={8}>
                <Ionicons name="call" size={16} color={colors.green} />
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {items.map((it, i) => {
            const img = imageUrl(it.image_url);
            return (
              <View key={i} style={styles.itemRow}>
                <View style={[styles.thumb, { backgroundColor: TINTS[i % TINTS.length] }]}>
                  {img ? <Image source={{ uri: img }} style={styles.thumbImg} resizeMode="contain" /> : null}
                </View>
                <View style={styles.flex}>
                  <Text style={styles.name} numberOfLines={2}>{it.product_name}</Text>
                  {it.variant_label ? <Text style={styles.variant}>{it.variant_label}</Text> : null}
                </View>
                <Text style={styles.qty}>×{it.quantity}</Text>
              </View>
            );
          })}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.25)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: spacing(2.5),
    paddingTop: spacing(1.25),
  },
  handle: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: spacing(2) },
  head: { flexDirection: "row", alignItems: "center", marginBottom: spacing(1.5) },
  title: { fontFamily: fonts.bold, fontSize: 19, color: colors.heading },
  sub: { fontFamily: fontsAlt.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  close: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgSoft, alignItems: "center", justifyContent: "center" },

  // Customer header
  customer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.5),
    backgroundColor: colors.bgSoft,
    borderRadius: 14,
    padding: spacing(1.5),
    marginBottom: spacing(1.5),
  },
  custAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  custAvatarImg: { width: "100%", height: "100%" },
  custInitial: { fontFamily: fonts.bold, fontSize: 18, color: colors.white },
  custName: { fontFamily: fonts.bold, fontSize: 15, color: colors.heading },
  custPhoneRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  custPhone: { flexShrink: 1, fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted },
  custCall: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.greenTint, alignItems: "center", justifyContent: "center" },

  list: { maxHeight: 380 },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing(1.25),
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  thumb: { width: 48, height: 48, borderRadius: 12, overflow: "hidden", marginRight: spacing(1.5) },
  thumbImg: { width: "100%", height: "100%", padding: 4 },
  name: { fontFamily: fonts.semibold, fontSize: 14, color: colors.heading },
  variant: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  qty: { fontFamily: fonts.bold, fontSize: 15, color: colors.heading, marginLeft: spacing(1) },
});
