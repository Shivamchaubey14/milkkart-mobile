import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import { colors, fonts, palette } from "../theme";

// A vehicle number on a Cream-Yolk (light) plate — two screw dots and bold Ink
// text, sized to its content and auto-shrinking to fit. Shared by the order
// screens and the rider dashboard. Pass `style` to add margins at the call site.
export function NumberPlate({
  number,
  large,
  style,
}: {
  number: string;
  large?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const screwOffset = large ? 6 : 5;
  return (
    <View style={[styles.plate, large && styles.plateLg, style]}>
      <View style={[styles.screw, large && styles.screwLg, { left: screwOffset }]} />
      <View style={[styles.screw, large && styles.screwLg, { right: screwOffset }]} />
      <Text style={[styles.text, large && styles.textLg]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {number}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  plate: {
    maxWidth: 130,
    paddingTop: 4,
    paddingBottom: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.heading,
    backgroundColor: palette.yellow[100], // Cream Yolk, light shade
    alignItems: "center",
    justifyContent: "center",
  },
  screw: { position: "absolute", top: 3, width: 2.5, height: 2.5, borderRadius: 1.25, backgroundColor: "rgba(37,61,78,0.35)" },
  text: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.5, color: colors.heading, textAlign: "center" },

  // Larger variant — e.g. the rider dashboard card.
  plateLg: { maxWidth: 138, paddingTop: 7, paddingBottom: 5, paddingHorizontal: 11, borderRadius: 5 },
  screwLg: { top: 5, width: 3, height: 3, borderRadius: 1.5 },
  textLg: { fontSize: 14, letterSpacing: 0.8 },
});

