import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";

import { colors, font, fonts, radius, spacing } from "../theme";

export function TextField({
  label,
  style,
  ...props
}: TextInputProps & { label?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.muted}
        {...props}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        style={[styles.input, focused && styles.inputFocused, style]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing(1.5) },
  label: { fontSize: font.small, fontFamily: fonts.semibold, color: colors.text, marginBottom: spacing(0.75) },
  input: {
    borderWidth: 2,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: spacing(1.75),
    paddingVertical: spacing(1.5),
    fontSize: font.body,
    fontFamily: fonts.medium,
    color: colors.heading,
    backgroundColor: colors.bg,
  },
  inputFocused: { borderColor: colors.green },
});
