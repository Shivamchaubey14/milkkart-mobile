import { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Animated, Modal, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RiderDelivery } from "../api/baseApi";
import { useT } from "../i18n/LanguageProvider";
import { MERCHANT_UPI } from "../payments/upi";
import { colors, fonts, fontsAlt, spacing } from "../theme";

const money = (n: number | string) => "₹" + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtDateTime(d: Date) {
  let h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${h}:${mm} ${ampm}`;
}

// A payment receipt "slip" shown after the rider confirms a UPI payment — the
// in-app equivalent of the POS machine's printed slip. Shareable, and continues
// to the OTP / confirm-delivery step.
export function PaymentSlipModal({
  delivery,
  onClose,
  onContinue,
}: {
  delivery: RiderDelivery | null;
  onClose: () => void;
  onContinue: () => void;
}) {
  const insets = useSafeAreaInsets();
  const t = useT();
  const visible = !!delivery;
  const translateY = useRef(new Animated.Value(700)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);
  const [data, setData] = useState<RiderDelivery | null>(delivery);
  const [paidAt, setPaidAt] = useState<Date>(() => new Date());

  useEffect(() => {
    if (delivery) {
      setData(delivery);
      setPaidAt(new Date()); // stamp the moment the slip is generated
    }
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

  const orderShort = data ? String(data.order_number).slice(0, 8).toUpperCase() : "";
  const amount = data ? (Number(data.cod_amount) > 0 ? data.cod_amount : data.total) : 0;
  const receiptNo = "MK" + orderShort + paidAt.getHours().toString().padStart(2, "0") + paidAt.getMinutes().toString().padStart(2, "0");

  async function share() {
    const lines = [
      MERCHANT_UPI.name,
      t("paymentReceipt") + " — " + t("paidStamp"),
      "",
      t("orderLabel") + " #" + orderShort,
      t("receiptNo") + " " + receiptNo,
      t("receiptAmount") + ": " + money(amount),
      t("receiptMethod") + ": " + t("methodUpi") + " (" + MERCHANT_UPI.vpa + ")",
      t("receiptDateTime") + ": " + fmtDateTime(paidAt),
    ];
    try {
      await Share.share({ message: lines.join("\n") });
    } catch (e) {
      /* user dismissed the share sheet */
    }
  }

  const row = (label: string, value: string) =>
    el(label, value);

  return (
    <Modal transparent visible={mounted} animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.sheet, { transform: [{ translateY }], paddingBottom: insets.bottom + spacing(2) }]}>
        <View style={styles.handle} />

        <View style={styles.slip}>
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark" size={26} color={colors.white} />
          </View>
          <Text style={styles.received}>{t("paymentReceived")}</Text>
          <Text style={styles.merchant} numberOfLines={2}>{MERCHANT_UPI.name}</Text>

          <Text style={styles.amount}>{money(amount)}</Text>
          <View style={styles.paidPill}>
            <Text style={styles.paidPillText}>{t("paidStamp")}</Text>
          </View>

          <View style={styles.dashed} />

          {row(t("orderLabel"), "#" + orderShort)}
          {row(t("receiptNo"), receiptNo)}
          {row(t("receiptMethod"), t("methodUpi"))}
          {row(t("receiptPaidTo"), MERCHANT_UPI.vpa)}
          {row(t("receiptDateTime"), fmtDateTime(paidAt))}
        </View>

        <View style={styles.btnRow}>
          <Pressable style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.85 }]} onPress={share}>
            <Ionicons name="share-social-outline" size={17} color={colors.green} />
            <Text style={styles.shareText}>{t("shareReceipt")}</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.continueBtn, pressed && { opacity: 0.85 }]} onPress={onContinue}>
            <Text style={styles.continueText}>{t("continueToDelivery")}</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

// A single label/value row on the slip.
function el(label: string, value: string) {
  return (
    <View key={label} style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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

  slip: {
    backgroundColor: colors.bgSoft,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing(2),
    paddingTop: spacing(2.25),
    paddingBottom: spacing(2),
    alignItems: "center",
  },
  checkBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  received: { fontFamily: fonts.bold, fontSize: 17, color: colors.heading, marginTop: spacing(1) },
  merchant: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, textAlign: "center", marginTop: 3 },
  amount: { fontFamily: fonts.bold, fontSize: 30, color: colors.green, marginTop: spacing(1.25) },
  paidPill: { backgroundColor: colors.greenTint, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 12, marginTop: spacing(0.75) },
  paidPillText: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1, color: colors.green },

  dashed: { alignSelf: "stretch", height: 1, borderBottomWidth: 1, borderStyle: "dashed", borderColor: colors.line, marginVertical: spacing(1.75) },

  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", alignSelf: "stretch", paddingVertical: 5, gap: spacing(1.5) },
  rowLabel: { fontFamily: fontsAlt.regular, fontSize: 13, color: colors.muted },
  rowValue: { flexShrink: 1, fontFamily: fonts.semibold, fontSize: 13, color: colors.heading },

  btnRow: { flexDirection: "row", gap: spacing(1.25), marginTop: spacing(2) },
  shareBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: colors.green },
  shareText: { fontFamily: fonts.bold, fontSize: 14, color: colors.green },
  continueBtn: { flex: 1.4, height: 50, borderRadius: 14, backgroundColor: colors.green, alignItems: "center", justifyContent: "center" },
  continueText: { fontFamily: fonts.bold, fontSize: 14, color: colors.white },
});
