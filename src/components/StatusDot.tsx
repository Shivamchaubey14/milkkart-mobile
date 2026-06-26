import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

// A status dot that gently blinks and emits an expanding glow halo while
// `active` (on duty). When inactive it's a plain static dot.
export function StatusDot({ active, color }: { active: boolean; color: string }) {
  const halo = useRef(new Animated.Value(0)).current; // expanding glow ring
  const blink = useRef(new Animated.Value(1)).current; // dot opacity

  useEffect(() => {
    if (!active) {
      halo.stopAnimation();
      blink.stopAnimation();
      halo.setValue(0);
      blink.setValue(1);
      return;
    }
    halo.setValue(0);
    blink.setValue(1);
    const haloLoop = Animated.loop(
      Animated.timing(halo, { toValue: 1, duration: 1500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    );
    const blinkLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 0.35, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    haloLoop.start();
    blinkLoop.start();
    return () => {
      haloLoop.stop();
      blinkLoop.stop();
    };
  }, [active, halo, blink]);

  const haloScale = halo.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] });
  const haloOpacity = halo.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  return (
    <View style={styles.wrap}>
      {active ? (
        <Animated.View
          style={[styles.halo, { backgroundColor: color, transform: [{ scale: haloScale }], opacity: haloOpacity }]}
          pointerEvents="none"
        />
      ) : null}
      <Animated.View
        style={[
          styles.dot,
          { backgroundColor: color, opacity: active ? blink : 1 },
          active && { shadowColor: color },
        ]}
      />
    </View>
  );
}

const SIZE = 9;
const styles = StyleSheet.create({
  wrap: { width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center" },
  halo: { position: "absolute", width: SIZE, height: SIZE, borderRadius: SIZE / 2 },
  dot: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    // Soft green glow on iOS; the halo carries the effect on Android.
    shadowOpacity: 0.9,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
});
