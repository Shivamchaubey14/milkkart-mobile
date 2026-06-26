import { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import QRCode from "react-native-qrcode-svg";

import { RiderDelivery } from "../api/baseApi";
import { useT } from "../i18n/LanguageProvider";
import { MERCHANT_UPI, upiUri } from "../payments/upi";
import { colors, fonts, fontsAlt, spacing } from "../theme";

const money = (n: number | string) => "₹" + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

// Bottom-sheet that shows a UPI QR (with the order amount pre-filled) so the
// customer can scan and pay the merchant directly. Same slide-up + fade pattern
// as the other rider sheets.
export function UpiQrModal({
  delivery,
  onClose,
  onPaid,
}: {
  delivery: RiderDelivery | null;
  onClose: () => void;
  // Called when the rider confirms the customer has paid — the parent then opens
  // the OTP / confirm-delivery sheet.
  onPaid: () => void;
}) {
  const insets = useSafeAreaInsets();
  const t = useT();
  const visible = !!delivery;
  const translateY = useRef(new Animated.Value(700)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);
  const [data, setData] = useState<RiderDelivery | null>(delivery);

  // Indeterminate "waiting for payment" bar — a segment that slides across the
  // track while the QR is shown. (A static POS QR has no callback to confirm
  // payment, so the rider taps "Payment received" once the money lands.)
  const slide = useRef(new Animated.Value(0)).current;
  const [trackW, setTrackW] = useState(0);

  useEffect(() => {
    if (delivery) setData(delivery);
  }, [delivery]);

  useEffect(() => {
    if (!visible) return;
    slide.setValue(0);
    const loop = Animated.loop(
      Animated.timing(slide, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

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

  const amount = data ? (Number(data.cod_amount) > 0 ? data.cod_amount : data.total) : 0;
  const uri = upiUri(amount);

  return (
    <Modal transparent visible={mounted} animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.sheet, { transform: [{ translateY }], paddingBottom: insets.bottom + spacing(2) }]}>
        <View style={styles.handle} />

        <View style={styles.head}>
          <View style={styles.flex}>
            <Text style={styles.title}>{t("payViaUpi")}</Text>
            <Text style={styles.sub}>{MERCHANT_UPI.name}</Text>
          </View>
          <Pressable style={styles.close} onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={18} color={colors.heading} />
          </Pressable>
        </View>

        <Text style={styles.amount}>{money(amount)}</Text>
        <Text style={styles.scanHint}>{t("scanToPayHint")}</Text>

        <View style={styles.qrWrap}>
          <QRCode value={uri} size={216} backgroundColor="#ffffff" color={colors.heading} />
        </View>

        <View style={styles.upiRow}>
          <Ionicons name="shield-checkmark-outline" size={15} color={colors.green} />
          <Text style={styles.upiId}>{MERCHANT_UPI.vpa}</Text>
        </View>
        <Text style={styles.foot}>{t("upiPaidToMerchant")}</Text>

        {/* Waiting-for-payment indicator */}
        <View style={styles.waitRow}>
          <View style={styles.dotPulse} />
          <Text style={styles.waitText}>{t("waitingForPayment")}</Text>
        </View>
        <View style={styles.progressTrack} onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}>
          {trackW > 0 ? (
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: trackW * 0.4,
                  transform: [
                    { translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [-trackW * 0.4, trackW] }) },
                  ],
                },
              ]}
            />
          ) : null}
        </View>

        <Pressable style={({ pressed }) => [styles.doneBtn, pressed && { opacity: 0.85 }]} onPress={onPaid}>
          <Ionicons name="checkmark-circle" size={18} color={colors.white} />
          <Text style={styles.doneText}>{t("paymentReceived")}</Text>
        </Pressable>
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
    alignItems: "center",
  },
  handle: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: spacing(2) },
  head: { flexDirection: "row", alignItems: "center", alignSelf: "stretch", marginBottom: spacing(1) },
  title: { fontFamily: fonts.bold, fontSize: 19, color: colors.heading },
  sub: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  close: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgSoft, alignItems: "center", justifyContent: "center" },

  amount: { fontFamily: fonts.bold, fontSize: 30, color: colors.green, marginTop: spacing(1) },
  scanHint: { fontFamily: fontsAlt.regular, fontSize: 13, color: colors.muted, marginTop: 2, textAlign: "center" },

  qrWrap: {
    marginTop: spacing(2),
    padding: spacing(2),
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
  },

  upiRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing(2) },
  upiId: { fontFamily: fonts.semibold, fontSize: 13, color: colors.heading },
  foot: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginTop: spacing(0.75), textAlign: "center" },

  waitRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: spacing(2) },
  dotPulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green },
  waitText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.heading },
  progressTrack: {
    alignSelf: "stretch",
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.lineSoft,
    overflow: "hidden",
    marginTop: spacing(1),
  },
  progressBar: { height: 6, borderRadius: 3, backgroundColor: colors.green },

  doneBtn: {
    flexDirection: "row",
    alignSelf: "stretch",
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: spacing(2),
  },
  doneText: { fontFamily: fonts.bold, fontSize: 15, color: colors.white },
});
