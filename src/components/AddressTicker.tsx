import { useEffect, useRef, useState } from "react";
import { Animated, StyleProp, TextStyle } from "react-native";

// Cycles through the saved-address labels (Home / Work / Other) with the same
// upward slide-and-fade ticker as the search box. Static when there's only one.
export function AddressTicker({ labels, style }: { labels: string[]; style?: StyleProp<TextStyle> }) {
  const items = labels.length ? labels : ["Home"];
  const [index, setIndex] = useState(0);
  const y = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (items.length < 2) return;
    const id = setInterval(() => {
      // Slide the current label up + fade out, swap, then bring the next up
      // from below — a continuous ticker (mirrors SearchBar).
      Animated.parallel([
        Animated.timing(y, { toValue: -12, duration: 220, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start(() => {
        setIndex((i) => (i + 1) % items.length);
        y.setValue(12);
        Animated.parallel([
          Animated.timing(y, { toValue: 0, duration: 220, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        ]).start();
      });
    }, 2000);
    return () => clearInterval(id);
  }, [items.length, y, opacity]);

  return (
    <Animated.Text style={[style, { opacity, transform: [{ translateY: y }] }]} numberOfLines={1}>
      {items[index % items.length]}
    </Animated.Text>
  );
}
