import { createContext, ReactNode, useCallback, useContext, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, fonts, fontsAlt, spacing } from "../theme";

type Variant = "success" | "error" | "info";
type ShowToast = (message: string, variant?: Variant) => void;

const ToastContext = createContext<ShowToast>(() => {});

// Drop-in toast used anywhere in the app: `const toast = useToast(); toast("Saved!")`.
export const useToast = () => useContext(ToastContext);

const ACCENT: Record<Variant, string> = {
  success: colors.green,
  error: colors.error,
  info: colors.info,
};
const ICON: Record<Variant, string> = { success: "✓", error: "!", info: "i" };

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<{ message: string; variant: Variant } | null>(null);
  const translateY = useRef(new Animated.Value(-24)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -24, duration: 180, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }, [opacity, translateY]);

  const show = useCallback<ShowToast>(
    (message, variant = "success") => {
      setToast({ message, variant });
      translateY.setValue(-24);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 8, tension: 80 }),
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(hide, 4000);
    },
    [hide, opacity, translateY],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.wrap,
            { top: insets.top + spacing(1), opacity, transform: [{ translateY }] },
          ]}
        >
          <View style={[styles.badge, { backgroundColor: ACCENT[toast.variant] }]}>
            <Text style={styles.icon}>{ICON[toast.variant]}</Text>
          </View>
          <Text style={styles.message}>{toast.message}</Text>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: spacing(2),
    right: spacing(2),
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg,
    borderRadius: 14,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(1.75),
    shadowColor: colors.heading,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  badge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing(1.25),
  },
  icon: { color: colors.white, fontFamily: fonts.bold, fontSize: 14, lineHeight: 18 },
  message: { flex: 1, color: colors.heading, fontFamily: fontsAlt.regular, fontSize: 13, lineHeight: 18 },
});
