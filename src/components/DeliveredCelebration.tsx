import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useOrderRatingQuery } from "../api/baseApi";
import { RateOrderModal } from "./RateOrderModal";
import { colors, fonts, fontsAlt, spacing } from "../theme";

const money = (n: number | string) => "₹" + Number(n).toFixed(2);
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

type Props = {
  orderNumber: string;
  total: number | string;
  /** ISO timestamp of the delivery (we use the order's last update). */
  deliveredAt: string;
  /** Rider name enables the optional delivery-partner rating in the modal. */
  riderName?: string | null;
  onReorder: () => void;
};

// The "Delivered" hero card — a looping gift Lottie, a check badge, the handover
// time, an order pill, and Rate order / Reorder actions. Rate order opens a
// bottom-sheet rating modal. Shared by the Track and Order Details screens.
export function DeliveredCelebration({ orderNumber, total, deliveredAt, riderName, onReorder }: Props) {
  const [rateOpen, setRateOpen] = useState(false);
  const [rated, setRated] = useState(false);

  // Reflect a previously-saved rating on load (the GET 404s when not yet rated).
  const { data: existingReview } = useOrderRatingQuery(orderNumber);
  useEffect(() => {
    if (existingReview) setRated(true);
  }, [existingReview]);

  return (
    <View style={styles.card}>
      <View style={styles.heroArt}>
        <View style={styles.heroCircle}>
          <LottieView
            source={require("../assets/lottie/delivered.json")}
            autoPlay
            loop
            style={styles.heroLottie}
          />
        </View>
        <View style={styles.heroCheck}>
          <Ionicons name="checkmark" size={26} color={colors.white} />
        </View>
      </View>

      <Text style={styles.title}>Delivered</Text>
      <Text style={styles.sub}>
        Handed over to you at <Text style={styles.bold}>{fmtTime(deliveredAt)}</Text>. Enjoy your fresh order!
      </Text>

      <View style={styles.pill}>
        <View style={styles.pillDot} />
        <Text style={styles.pillText}>
          Order #{orderNumber.slice(0, 8)} · {money(total)}
        </Text>
      </View>

      <View style={styles.btns}>
        <Pressable
          style={({ pressed }) => [styles.rateBtn, !rated && pressed && { opacity: 0.9 }]}
          onPress={() => setRateOpen(true)}
          disabled={rated}
        >
          {rated ? (
            <View style={styles.rateRated}>
              <Ionicons name="star" size={15} color={colors.white} />
              <Text style={styles.rateText}>Rated</Text>
            </View>
          ) : (
            <Text style={styles.rateText}>Rate order</Text>
          )}
        </Pressable>
        <Pressable style={({ pressed }) => [styles.reorderBtn, pressed && { opacity: 0.7 }]} onPress={onReorder}>
          <Text style={styles.reorderText}>Reorder</Text>
        </Pressable>
      </View>

      <RateOrderModal
        visible={rateOpen}
        orderNumber={orderNumber}
        riderName={riderName}
        onClose={(submitted) => {
          setRateOpen(false);
          if (submitted) setRated(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing(2.25),
    paddingTop: spacing(2),
    paddingBottom: spacing(2.25),
    alignItems: "center",
  },
  heroArt: { alignItems: "center", marginBottom: spacing(0.25) },
  heroCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.greenTint,
    alignItems: "center",
    justifyContent: "center",
  },
  heroLottie: { width: 118, height: 118 },
  heroCheck: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.green,
    borderWidth: 3,
    borderColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -18,
    shadowColor: colors.green,
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  title: { fontFamily: fonts.bold, fontSize: 19, color: colors.heading, marginTop: spacing(1) },
  sub: {
    fontFamily: fontsAlt.regular,
    fontSize: 13,
    color: colors.text,
    textAlign: "center",
    lineHeight: 19,
    marginTop: 5,
    paddingHorizontal: spacing(0.75),
  },
  bold: { fontFamily: fonts.bold, color: colors.heading },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: colors.greenTint,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 14,
    marginTop: spacing(1.75),
  },
  pillDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.green },
  pillText: { fontFamily: fonts.bold, fontSize: 12, color: colors.greenDark },
  btns: { flexDirection: "row", gap: spacing(1.25), marginTop: spacing(2), alignSelf: "stretch" },
  rateBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.green,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  rateRated: { flexDirection: "row", alignItems: "center", gap: 6 },
  rateText: { fontFamily: fonts.bold, fontSize: 14, color: colors.white },
  reorderBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.bg,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  reorderText: { fontFamily: fonts.bold, fontSize: 14, color: colors.heading },
});
