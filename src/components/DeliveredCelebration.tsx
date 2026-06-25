import { Ionicons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fonts, fontsAlt, spacing } from "../theme";

const money = (n: number | string) => "₹" + Number(n).toFixed(2);
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

type Props = {
  orderNumber: string;
  total: number | string;
  /** ISO timestamp of the delivery (we use the order's last update). */
  deliveredAt: string;
  onRate: () => void;
  onReorder: () => void;
};

// The "Delivered" hero card — a one-shot gift Lottie, a check badge, the
// handover time, an order pill, and Rate order / Reorder actions. Shared by the
// Track and Order Details screens so they always match.
export function DeliveredCelebration({ orderNumber, total, deliveredAt, onRate, onReorder }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.heroArt}>
        <View style={styles.heroCircle}>
          <LottieView
            source={require("../assets/lottie/delivered.json")}
            autoPlay
            loop={false}
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
        <Pressable style={({ pressed }) => [styles.rateBtn, pressed && { opacity: 0.9 }]} onPress={onRate}>
          <Text style={styles.rateText}>Rate order</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [styles.reorderBtn, pressed && { opacity: 0.7 }]} onPress={onReorder}>
          <Text style={styles.reorderText}>Reorder</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg,
    borderRadius: 24,
    paddingHorizontal: spacing(3),
    paddingTop: spacing(2),
    paddingBottom: spacing(3),
    alignItems: "center",
    shadowColor: "#253d4e",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  heroArt: { alignItems: "center", marginBottom: spacing(0.5) },
  heroCircle: {
    width: 168,
    height: 168,
    borderRadius: 84,
    backgroundColor: colors.greenTint,
    alignItems: "center",
    justifyContent: "center",
  },
  heroLottie: { width: 210, height: 210 },
  heroCheck: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.green,
    borderWidth: 4,
    borderColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -26,
    shadowColor: colors.green,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  title: { fontFamily: fonts.bold, fontSize: 26, color: colors.heading, marginTop: spacing(1.5) },
  sub: {
    fontFamily: fontsAlt.regular,
    fontSize: 14,
    color: colors.text,
    textAlign: "center",
    lineHeight: 21,
    marginTop: spacing(1),
    paddingHorizontal: spacing(1),
  },
  bold: { fontFamily: fonts.bold, color: colors.heading },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.greenTint,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginTop: spacing(2.5),
  },
  pillDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green },
  pillText: { fontFamily: fonts.bold, fontSize: 13, color: colors.greenDark },
  btns: { flexDirection: "row", gap: spacing(1.5), marginTop: spacing(2.5), alignSelf: "stretch" },
  rateBtn: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.green,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  rateText: { fontFamily: fonts.bold, fontSize: 15, color: colors.white },
  reorderBtn: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.bg,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  reorderText: { fontFamily: fonts.bold, fontSize: 15, color: colors.heading },
});
