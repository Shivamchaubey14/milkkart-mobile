import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";

import { colors, font, radius, spacing } from "../theme";

type Variant = "primary" | "outline" | "ghost";

export function Button({
  title,
  onPress,
  loading,
  disabled,
  variant = "primary",
  style,
}: {
  title: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: Variant;
  style?: ViewStyle;
}) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variant === "primary" && styles.primary,
        variant === "outline" && styles.outline,
        variant === "ghost" && styles.ghost,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? colors.white : colors.green} />
      ) : (
        <Text
          style={[
            styles.label,
            variant === "primary" ? styles.labelPrimary : styles.labelGreen,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing(2.5),
    flexDirection: "row",
  },
  primary: { backgroundColor: colors.green },
  outline: { backgroundColor: colors.white, borderWidth: 2, borderColor: colors.line },
  ghost: { backgroundColor: "transparent" },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.85 },
  label: { fontSize: font.body, fontWeight: "700" },
  labelPrimary: { color: colors.white },
  labelGreen: { color: colors.green },
});
