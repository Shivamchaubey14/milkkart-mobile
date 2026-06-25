import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { colors } from "../theme";

const BLUSH = "#ef7d8e";

const TRACK_W = 64;
const TRACK_H = 34;
const KNOB = 28;
const PAD = 3;
const TRAVEL = TRACK_W - KNOB - PAD * 2; // knob's left → right travel

const INK = colors.heading;

// Cheerful kawaii face for the "on duty" (yellow) knob — smiling curved eyes,
// a smile, and rosy cheeks.
function HappyFace() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Circle cx={6} cy={14} r={2.1} fill={BLUSH} opacity={0.5} />
      <Circle cx={18} cy={14} r={2.1} fill={BLUSH} opacity={0.5} />
      <Path d="M6.5 10.8 Q8.5 13.2 10.5 10.8" stroke={INK} strokeWidth={1.7} fill="none" strokeLinecap="round" />
      <Path d="M13.5 10.8 Q15.5 13.2 17.5 10.8" stroke={INK} strokeWidth={1.7} fill="none" strokeLinecap="round" />
      <Path d="M9 14.6 Q12 17.4 15 14.6" stroke={INK} strokeWidth={1.7} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

// Same kawaii style, asleep — gentle closed arcs and softer cheeks for the
// "off duty" (grey) knob.
function SleepyFace() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Circle cx={6} cy={14} r={2.1} fill={BLUSH} opacity={0.35} />
      <Circle cx={18} cy={14} r={2.1} fill={BLUSH} opacity={0.35} />
      <Path d="M6.5 11.5 Q8.5 9.4 10.5 11.5" stroke={INK} strokeWidth={1.7} fill="none" strokeLinecap="round" />
      <Path d="M13.5 11.5 Q15.5 9.4 17.5 11.5" stroke={INK} strokeWidth={1.7} fill="none" strokeLinecap="round" />
      <Path d="M10 15 Q12 16.4 14 15" stroke={INK} strokeWidth={1.7} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

// Animated duty switch: the knob slides and morphs (sleepy ↔ happy) while the
// track fades grey → green. Tap anywhere on it to toggle.
export function DutyToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: value ? 1 : 0, duration: 260, useNativeDriver: false }).start();
  }, [value, anim]);

  const trackColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(255,255,255,0.16)", colors.green],
  });
  const knobColor = anim.interpolate({ inputRange: [0, 1], outputRange: ["#cfd6db", colors.yellow] });
  const knobX = anim.interpolate({ inputRange: [0, 1], outputRange: [PAD, PAD + TRAVEL] });

  return (
    <Pressable onPress={() => onChange(!value)} hitSlop={6}>
      <Animated.View style={[styles.track, { backgroundColor: trackColor }]}>
        <Animated.View style={[styles.knob, { backgroundColor: knobColor, transform: [{ translateX: knobX }] }]}>
          {value ? <HappyFace /> : <SleepyFace />}
          {value ? null : <Text style={styles.zzz}>z</Text>}
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: TRACK_W, height: TRACK_H, borderRadius: TRACK_H / 2, flexDirection: "row", alignItems: "center" },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  zzz: { position: "absolute", top: 1, right: 4, fontSize: 9, fontWeight: "700", color: INK },
});
