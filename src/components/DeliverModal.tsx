import { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  Animated,
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RiderDelivery, useDeliverOrderMutation, useReturnOrderMutation } from "../api/baseApi";
import { imageUrl } from "../api/config";
import { useT } from "../i18n/LanguageProvider";
import { useToast } from "./Toast";
import { colors, fonts, fontsAlt, spacing } from "../theme";

// Bottom-sheet to complete a delivery: enter the OTP, optionally attach a proof
// photo, then Confirm. A "Customer refused items?" section lets the rider return
// selected line items instead. Same slide-up + fade pattern as the other sheets.
export function DeliverModal({
  delivery,
  onClose,
  paidViaUpi = false,
}: {
  delivery: RiderDelivery | null;
  onClose: () => void;
  // True when this COD order's amount was already collected via the UPI QR, so
  // the backend records it as UPI-collected (vs cash-in-hand).
  paidViaUpi?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const t = useT();
  const [deliverOrder, { isLoading: delivering }] = useDeliverOrderMutation();
  const [returnOrder, { isLoading: returning }] = useReturnOrderMutation();

  const [otp, setOtp] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [selected, setSelected] = useState<number[]>([]);

  const visible = !!delivery;
  const [data, setData] = useState<RiderDelivery | null>(delivery);
  const translateY = useRef(new Animated.Value(800)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  // Keyboard height (minus the safe-area inset) used as scroll padding so the
  // form can be scrolled clear of the keyboard — the sheet itself stays put.
  const [kbHeight, setKbHeight] = useState(0);
  const codeRef = useRef<TextInput>(null);
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (delivery) {
      setData(delivery);
      setOtp("");
      setPhoto(null);
      setSelected([]);
    }
  }, [delivery]);

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const onShow = (e: { endCoordinates: { height: number } }) =>
      setKbHeight(Math.max(0, e.endCoordinates.height - insets.bottom));
    const onHide = () => setKbHeight(0);
    const s = Keyboard.addListener(showEvt, onShow);
    const h = Keyboard.addListener(hideEvt, onHide);
    return () => {
      s.remove();
      h.remove();
    };
  }, [insets.bottom]);

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
        Animated.timing(translateY, { toValue: 800, duration: 220, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  async function addPhoto() {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        toast(t("toastCameraPerm"), "info");
        return;
      }
      const r = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.4 });
      if (!r.canceled && r.assets[0]?.base64) setPhoto(`data:image/jpeg;base64,${r.assets[0].base64}`);
    } catch {
      toast(t("toastCameraOpen"), "error");
    }
  }

  async function confirm() {
    if (!data) return;
    if (otp.trim().length !== 6) {
      toast(t("toastEnterOtp"), "info");
      return;
    }
    try {
      await deliverOrder({
        orderNumber: data.order_number,
        otp: otp.trim(),
        proof_photo: photo ?? "",
        paid_via_upi: paidViaUpi,
      }).unwrap();
      toast(t("toastDeliveryConfirmed"));
      onClose();
    } catch (e: any) {
      toast(e?.data?.error || t("toastConfirmFailed"), "error");
    }
  }

  function toggleItem(id: number) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function returnSelected() {
    if (!data || selected.length === 0) {
      toast(t("toastSelectRefused"), "info");
      return;
    }
    try {
      await returnOrder({ orderNumber: data.order_number, item_ids: selected }).unwrap();
      toast(t("toastRefusedReturned"));
      onClose();
    } catch (e: any) {
      toast(e?.data?.error || t("toastReturnFailed"), "error");
    }
  }

  if (!mounted) return null;

  const items = (data?.items ?? []).filter((it) => !it.is_returned);
  const busy = delivering || returning;

  return (
    <Modal transparent visible={mounted} onRequestClose={onClose} animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <View style={styles.kav} pointerEvents="box-none">
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY }], paddingBottom: insets.bottom + spacing(2) }]}
        >
          <View style={styles.handle} />
          <View style={styles.head}>
            <View style={styles.flex}>
              <Text style={styles.title}>{t("confirmDelivery")}</Text>
              {data ? <Text style={styles.sub}>#{data.order_number.slice(0, 8)}</Text> : null}
            </View>
            <Pressable style={styles.close} onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={18} color={colors.heading} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={{ paddingBottom: kbHeight }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.label}>{t("deliveryOtp")}</Text>
            {/* Six segmented "cube" boxes backed by one hidden input (matches login). */}
            <Pressable style={styles.otpRow} onPress={() => codeRef.current?.focus()}>
              {Array.from({ length: 6 }, (_, i) => {
                const char = otp[i] ?? "";
                const active = i === otp.length;
                return (
                  <View key={i} style={[styles.otpBox, char ? styles.otpBoxFilled : null, active ? styles.otpBoxActive : null]}>
                    {char ? <Text style={styles.otpDigit}>{char}</Text> : active ? <View style={styles.otpCaret} /> : null}
                  </View>
                );
              })}
              <TextInput
                ref={codeRef}
                style={styles.otpHiddenInput}
                value={otp}
                onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, "").slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
              />
            </Pressable>

            {photo ? (
              <View style={styles.photoPreview}>
                <Image source={{ uri: photo }} style={styles.photoImg} />
                <Pressable style={styles.photoRemove} onPress={() => setPhoto(null)} hitSlop={6}>
                  <Ionicons name="close" size={14} color={colors.white} />
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.photoBtn} onPress={addPhoto}>
                <Ionicons name="camera-outline" size={18} color={colors.green} />
                <Text style={styles.photoBtnText}>{t("addProofPhoto")}</Text>
              </Pressable>
            )}

            <View style={styles.btnRow}>
              <Pressable style={[styles.cancelBtn]} onPress={onClose} disabled={busy}>
                <Text style={styles.cancelText}>{t("cancel")}</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.confirmBtn, (pressed || busy) && { opacity: 0.85 }]}
                onPress={confirm}
                disabled={busy}
              >
                <Text style={styles.confirmText}>{delivering ? t("confirming") : t("confirmDeliveryBtn")}</Text>
              </Pressable>
            </View>

            {items.length ? (
              <>
                <View style={styles.divider} />
                <Text style={styles.refuseLabel}>{t("customerRefused")}</Text>
                {items.map((it) => {
                  const on = selected.includes(it.id);
                  const img = imageUrl(it.image_url);
                  return (
                    <Pressable key={it.id} style={styles.itemRow} onPress={() => toggleItem(it.id)}>
                      <Ionicons
                        name={on ? "checkbox" : "square-outline"}
                        size={22}
                        color={on ? colors.green : colors.line}
                      />
                      <View style={styles.itemThumb}>
                        {img ? <Image source={{ uri: img }} style={styles.itemThumbImg} resizeMode="contain" /> : null}
                      </View>
                      <View style={styles.flex}>
                        <Text style={styles.itemName} numberOfLines={1}>{it.product_name}</Text>
                        <Text style={styles.itemMeta}>{it.variant_label} · {t("qtyLabel")} {it.quantity}</Text>
                      </View>
                    </Pressable>
                  );
                })}
                <Pressable
                  style={({ pressed }) => [
                    styles.returnBtn,
                    selected.length === 0 && styles.returnBtnDisabled,
                    pressed && selected.length > 0 && { opacity: 0.85 },
                  ]}
                  onPress={returnSelected}
                  disabled={busy || selected.length === 0}
                >
                  <Ionicons name="arrow-undo-outline" size={16} color={selected.length ? colors.error : colors.muted} />
                  <Text style={[styles.returnText, selected.length === 0 && { color: colors.muted }]}>
                    {returning
                      ? t("returning")
                      : selected.length
                        ? t("returnSelectedCount", { n: selected.length })
                        : t("returnSelected")}
                  </Text>
                </Pressable>
              </>
            ) : null}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.25)" },
  kav: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: spacing(2.5),
    paddingTop: spacing(1.25),
  },
  handle: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: spacing(2) },
  head: { flexDirection: "row", alignItems: "center", marginBottom: spacing(1) },
  title: { fontFamily: fonts.bold, fontSize: 19, color: colors.heading },
  sub: { fontFamily: fontsAlt.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  close: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgSoft, alignItems: "center", justifyContent: "center" },

  body: { maxHeight: 460 },
  label: { fontFamily: fonts.semibold, fontSize: 14, color: colors.heading, marginTop: spacing(1.5), marginBottom: spacing(1) },
  otpRow: { flexDirection: "row", gap: spacing(1), position: "relative" },
  otpBox: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  otpBoxFilled: { borderColor: colors.green },
  otpBoxActive: { borderColor: colors.green, backgroundColor: colors.greenTint },
  otpDigit: { fontFamily: fonts.bold, fontSize: 22, color: colors.heading },
  otpCaret: { width: 2, height: 22, borderRadius: 1, backgroundColor: colors.heading },
  otpHiddenInput: { position: "absolute", width: "100%", height: "100%", opacity: 0 },
  photoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.green,
    marginTop: spacing(1.5),
  },
  photoBtnText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.green },
  photoPreview: { marginTop: spacing(1.5), borderRadius: 12, overflow: "hidden", height: 120 },
  photoImg: { width: "100%", height: "100%" },
  photoRemove: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(37,61,78,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },

  btnRow: { flexDirection: "row", gap: spacing(1.25), marginTop: spacing(2) },
  cancelBtn: { flex: 1, height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  cancelText: { fontFamily: fonts.bold, fontSize: 15, color: colors.heading },
  confirmBtn: { flex: 2, height: 52, borderRadius: 14, backgroundColor: colors.green, alignItems: "center", justifyContent: "center" },
  confirmText: { fontFamily: fonts.bold, fontSize: 15, color: colors.white },

  divider: { height: 1, backgroundColor: colors.lineSoft, marginTop: spacing(2.5), marginBottom: spacing(1.5) },
  refuseLabel: { fontFamily: fonts.bold, fontSize: 14, color: colors.heading, marginBottom: spacing(1) },
  itemRow: { flexDirection: "row", alignItems: "center", gap: spacing(1.25), paddingVertical: spacing(1) },
  itemThumb: { width: 38, height: 38, borderRadius: 9, backgroundColor: colors.bgSoft, overflow: "hidden" },
  itemThumbImg: { width: "100%", height: "100%", padding: 3 },
  itemName: { fontFamily: fonts.semibold, fontSize: 14, color: colors.heading },
  itemMeta: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginTop: 1 },
  returnBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.error,
    marginTop: spacing(1.5),
  },
  returnBtnDisabled: { borderColor: colors.line },
  returnText: { fontFamily: fonts.bold, fontSize: 14, color: colors.error },
});
