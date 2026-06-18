import { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Animated, StyleSheet, Text, TextInput, View } from "react-native";

import { colors, fonts } from "../theme";

// Rotating search hints. Static for now — later these come from the catalog
// (top categories / popular products) so the suggestions stay in sync.
const TERMS = ["Milk", "Curd", "Paneer", "Bread", "Butter", "Ghee", "Cheese", "Yogurt"];

export function SearchBar({ onChangeText }: { onChangeText?: (t: string) => void }) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [index, setIndex] = useState(0);

  const y = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  // Show the animated hint only while the field is empty and unfocused.
  const showHint = !focused && value.length === 0;

  useEffect(() => {
    if (!showHint) return;
    const id = setInterval(() => {
      // Slide the current word up and fade it out, swap, then bring the next
      // word up from below — a continuous ticker loop.
      Animated.parallel([
        Animated.timing(y, { toValue: -12, duration: 220, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start(() => {
        setIndex((i) => (i + 1) % TERMS.length);
        y.setValue(12);
        Animated.parallel([
          Animated.timing(y, { toValue: 0, duration: 220, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        ]).start();
      });
    }, 2000);
    return () => clearInterval(id);
  }, [showHint, y, opacity]);

  return (
    <View style={styles.search}>
      <Ionicons name="search" size={18} color={colors.muted} />
      <View style={styles.field}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={(t) => {
            setValue(t);
            onChangeText?.(t);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {showHint ? (
          <View style={styles.hint} pointerEvents="none">
            <Text style={styles.hintText}>Search for </Text>
            <Animated.Text style={[styles.hintTerm, { opacity, transform: [{ translateY: y }] }]}>
              “{TERMS[index]}”
            </Animated.Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
  },
  field: { flex: 1, marginLeft: 8, justifyContent: "center" },
  input: { fontFamily: fonts.medium, fontSize: 14, color: colors.heading, paddingVertical: 0 },
  hint: { ...StyleSheet.absoluteFillObject, flexDirection: "row", alignItems: "center" },
  hintText: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
  hintTerm: { fontFamily: fonts.semibold, fontSize: 14, color: colors.muted },
});
