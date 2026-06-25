import { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  Animated,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSubmitOrderRatingMutation } from "../api/baseApi";
import { useToast } from "./Toast";
import { colors, fonts, fontsAlt, spacing } from "../theme";

type Props = {
  visible: boolean;
  orderNumber: string;
  riderName?: string | null;
  /** submitted=true once a rating was saved, so the caller can mark it rated. */
  onClose: (submitted: boolean) => void;
};

function Stars({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} hitSlop={6}>
          <Ionicons
            name={n <= value ? "star" : "star-outline"}
            size={34}
            color={n <= value ? colors.rating : colors.line}
          />
        </Pressable>
      ))}
    </View>
  );
}

// Bottom-sheet that collects an order rating, an optional delivery-partner
// rating, and a note, then POSTs the review. Mirrors the Wallet "Add money"
// sheet: a custom Animated spring slides the sheet up while the backdrop fades
// in place (animationType="none"), so the scrim never looks like it slides in.
export function RateOrderModal({ visible, orderNumber, riderName, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [submitRating, { isLoading }] = useSubmitOrderRatingMutation();
  const [orderRating, setOrderRating] = useState(0);
  const [riderRating, setRiderRating] = useState(0);
  const [comment, setComment] = useState("");

  const translateY = useRef(new Animated.Value(700)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  // Keyboard height — the sheet slides up by this so the input + Submit clear it.
  const keyboard = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const onShow = (e: { endCoordinates: { height: number } }) =>
      Animated.timing(keyboard, {
        toValue: Math.max(0, e.endCoordinates.height - insets.bottom),
        duration: 220,
        useNativeDriver: true,
      }).start();
    const onHide = () =>
      Animated.timing(keyboard, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    const showSub = Keyboard.addListener(showEvt, onShow);
    const hideSub = Keyboard.addListener(hideEvt, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      ]).start(() => {
        setMounted(false);
        setOrderRating(0);
        setRiderRating(0);
        setComment("");
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const onSubmit = async () => {
    if (!orderRating) {
      toast("Please rate your order first.", "info");
      return;
    }
    try {
      await submitRating({
        orderNumber,
        order_rating: orderRating,
        rider_rating: riderRating || null,
        comment: comment.trim(),
      }).unwrap();
      toast("Thanks for your rating!");
      onClose(true);
    } catch {
      toast("Couldn't submit your rating. Please try again.", "error");
    }
  };

  if (!mounted) return null;

  return (
    <Modal transparent visible={mounted} onRequestClose={() => onClose(false)} animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => onClose(false)} />
      </Animated.View>

      <View style={styles.kav} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY: Animated.subtract(translateY, keyboard) }],
              paddingBottom: insets.bottom + spacing(2),
            },
          ]}
        >
          <View style={styles.handle} />

          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>Rate this order</Text>
            <Pressable style={styles.sheetClose} onPress={() => onClose(false)} hitSlop={8}>
              <Ionicons name="close" size={18} color={colors.heading} />
            </Pressable>
          </View>

          <Text style={styles.label}>Your order rating</Text>
          <Stars value={orderRating} onChange={setOrderRating} />

          {riderName ? (
            <>
              <Text style={styles.label}>Your delivery partner rating</Text>
              <Stars value={riderRating} onChange={setRiderRating} />
            </>
          ) : null}

          <Text style={styles.label}>How was it? (optional)</Text>
          <TextInput
            style={styles.input}
            value={comment}
            onChangeText={setComment}
            placeholder="Share a little about your experience…"
            placeholderTextColor={colors.muted}
            multiline
            maxLength={500}
          />

          <Pressable
            style={({ pressed }) => [styles.submitBtn, (pressed || isLoading) && { opacity: 0.85 }]}
            onPress={onSubmit}
            disabled={isLoading}
          >
            <Text style={styles.submitText}>{isLoading ? "Submitting…" : "Submit rating"}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(37,61,78,0.45)" },
  kav: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: spacing(2.5),
    paddingTop: spacing(1.25),
  },
  handle: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: spacing(2) },
  sheetHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sheetTitle: { fontFamily: fonts.bold, fontSize: 20, color: colors.heading },
  sheetClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bgSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.heading,
    marginTop: spacing(2),
    marginBottom: spacing(1),
  },
  stars: { flexDirection: "row", gap: spacing(1) },
  input: {
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 12,
    padding: spacing(1.5),
    minHeight: 80,
    fontFamily: fontsAlt.regular,
    fontSize: 14,
    color: colors.heading,
    textAlignVertical: "top",
  },
  submitBtn: {
    height: 54,
    borderRadius: 14,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing(3),
    shadowColor: colors.green,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  submitText: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },
});
