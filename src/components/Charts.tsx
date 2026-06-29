import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

import { colors, fonts, fontsAlt } from "../theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type DonutSegment = { value: number; color: string; label: string };

/**
 * An animated multi-segment donut. Each coloured arc sweeps in clockwise from the
 * top as a single progress value drives a smooth draw-in, then a legend lists the
 * segments. Built on react-native-svg so it needs no extra native dependency.
 */
export function DonutChart({
  segments,
  size = 168,
  stroke = 24,
  centerValue,
  centerLabel,
}: {
  segments: DonutSegment[];
  size?: number;
  stroke?: number;
  centerValue?: string;
  centerLabel?: string;
}) {
  const visible = segments.filter((s) => s.value > 0);
  const total = visible.reduce((sum, s) => sum + s.value, 0);
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const progress = useRef(new Animated.Value(0)).current;

  // Re-draw whenever the data changes (e.g. a new date range).
  const key = visible.map((s) => `${s.label}:${s.value}`).join("|");
  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 950,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [key, progress]);

  let acc = 0;
  const arcs = visible.map((seg) => {
    const startFrac = total ? acc / total : 0;
    acc += seg.value;
    const endFrac = total ? acc / total : 0;
    const dash = circ * (total ? seg.value / total : 0);
    return { seg, startFrac, endFrac, dash, rotation: startFrac * 360 - 90 };
  });

  return (
    <View style={styles.donutWrap}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.bgSoft} strokeWidth={stroke} fill="none" />
          {arcs.map((a, i) => (
            <G key={i} originX={size / 2} originY={size / 2} rotation={a.rotation}>
              <AnimatedCircle
                cx={size / 2}
                cy={size / 2}
                r={r}
                stroke={a.seg.color}
                strokeWidth={stroke}
                fill="none"
                strokeDasharray={`${a.dash} ${circ}`}
                strokeDashoffset={progress.interpolate({
                  inputRange: [a.startFrac, a.endFrac || 0.0001],
                  outputRange: [a.dash, 0],
                  extrapolate: "clamp",
                })}
              />
            </G>
          ))}
        </Svg>
        {centerValue || centerLabel ? (
          <View style={[StyleSheet.absoluteFill, styles.center]}>
            {centerValue ? <Text style={styles.centerValue}>{centerValue}</Text> : null}
            {centerLabel ? <Text style={styles.centerLabel}>{centerLabel}</Text> : null}
          </View>
        ) : null}
      </View>

      <View style={styles.legend}>
        {visible.map((s, i) => (
          <View key={i} style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: s.color }]} />
            <Text style={styles.legendLabel} numberOfLines={1}>{s.label}</Text>
            <Text style={styles.legendValue}>{s.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** A horizontal bar whose fill grows in from 0 to `pct`% on mount/data change. */
export function AnimatedBar({
  pct,
  color = colors.green,
  track = colors.bgSoft,
  height = 6,
  delay = 0,
}: {
  pct: number;
  color?: string;
  track?: string;
  height?: number;
  delay?: number;
}) {
  const p = useRef(new Animated.Value(0)).current;
  const target = Math.max(0, Math.min(100, pct));

  useEffect(() => {
    p.setValue(0);
    Animated.timing(p, {
      toValue: 1,
      duration: 750,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [target, delay, p]);

  const width = p.interpolate({ inputRange: [0, 1], outputRange: ["0%", `${target}%`] });

  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: track, overflow: "hidden" }}>
      <Animated.View style={{ width, height: "100%", borderRadius: height / 2, backgroundColor: color }} />
    </View>
  );
}

const styles = StyleSheet.create({
  donutWrap: { flexDirection: "row", alignItems: "center", gap: 18 },
  center: { alignItems: "center", justifyContent: "center" },
  centerValue: { fontFamily: fonts.bold, fontSize: 26, color: colors.heading },
  centerLabel: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginTop: 2 },

  legend: { flex: 1, gap: 8 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { flex: 1, fontFamily: fonts.semibold, fontSize: 13, color: colors.heading },
  legendValue: { fontFamily: fonts.bold, fontSize: 13, color: colors.heading },
});
