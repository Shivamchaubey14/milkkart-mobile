import { useEffect, useRef, useState } from "react";
import {
  Animated,
  DimensionValue,
  Easing,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { colors, radius as R, spacing } from "../theme";

/**
 * A single shimmering placeholder block. Compose these into screen-shaped
 * skeletons (see the layouts exported below). A soft highlight band sweeps
 * left→right across the neutral base for a clean, modern "loading" feel.
 */
export function Skeleton({
  width = "100%",
  height = 14,
  radius = R.sm,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [w, setW] = useState(0);
  const x = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(x, {
        toValue: 1,
        duration: 1100,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [x]);

  const translateX = x.interpolate({ inputRange: [0, 1], outputRange: [-w, w] });

  return (
    <View
      onLayout={(e) => {
        const lw = e.nativeEvent.layout.width;
        if (lw && Math.abs(lw - w) > 1) setW(lw);
      }}
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.skeleton, overflow: "hidden" }, style]}
    >
      {w > 0 ? (
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX }] }]}>
          <LinearGradient
            colors={["transparent", colors.skeletonHi, "transparent"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

// ---- Composite, screen-shaped skeletons ----------------------------------

/** A product card placeholder — image tile, two text lines, price + add row. */
export function ProductCardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton height={104} radius={0} />
      <View style={styles.cardBody}>
        <Skeleton width="45%" height={9} />
        <Skeleton width="85%" height={13} style={{ marginTop: 8 }} />
        <View style={styles.cardFoot}>
          <Skeleton width={48} height={15} />
          <Skeleton width={52} height={28} radius={8} />
        </View>
      </View>
    </View>
  );
}

/** A 2-column grid of product cards (Home, Wishlist, search results). */
export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View style={styles.grid}>
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </View>
  );
}

/** Home: a promo banner + category chips + the product grid. */
export function HomeSkeleton() {
  return (
    <View style={styles.pad}>
      <Skeleton height={120} radius={R.lg} />
      <Skeleton width={120} height={18} style={{ marginTop: spacing(3) }} />
      <View style={styles.chips}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} width={72} height={32} radius={R.pill} />
        ))}
      </View>
      <Skeleton width={150} height={18} style={{ marginTop: spacing(3), marginBottom: spacing(2) }} />
      <ProductGridSkeleton />
    </View>
  );
}

/** A single list row — thumbnail, two lines, and a trailing pill/amount. */
export function ListRowSkeleton({ thumb = true }: { thumb?: boolean }) {
  return (
    <View style={styles.row}>
      {thumb ? <Skeleton width={48} height={48} radius={12} /> : null}
      <View style={styles.rowBody}>
        <Skeleton width="70%" height={13} />
        <Skeleton width="45%" height={10} style={{ marginTop: 8 }} />
      </View>
      <Skeleton width={54} height={20} radius={7} />
    </View>
  );
}

/** A vertical list of rows (Orders, Notifications, Subscriptions, Cart…). */
export function ListSkeleton({ rows = 6, thumb = true }: { rows?: number; thumb?: boolean }) {
  return (
    <View style={styles.pad}>
      {Array.from({ length: rows }).map((_, i) => (
        <ListRowSkeleton key={i} thumb={thumb} />
      ))}
    </View>
  );
}

/** A header banner followed by a few stacked content cards (detail screens). */
export function DetailSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <View style={styles.pad}>
      <Skeleton height={92} radius={R.xl} />
      {Array.from({ length: cards }).map((_, i) => (
        <View key={i} style={styles.block}>
          <Skeleton width="40%" height={11} />
          <Skeleton width="100%" height={14} style={{ marginTop: 12 }} />
          <Skeleton width="80%" height={14} style={{ marginTop: 8 }} />
        </View>
      ))}
    </View>
  );
}

/** Product detail: big image, title lines, price and a primary button. */
export function ProductDetailSkeleton() {
  return (
    <View style={styles.pad}>
      <Skeleton height={260} radius={R.lg} />
      <Skeleton width="40%" height={11} style={{ marginTop: spacing(2.5) }} />
      <Skeleton width="80%" height={20} style={{ marginTop: 12 }} />
      <Skeleton width="55%" height={20} style={{ marginTop: 8 }} />
      <View style={styles.variantRow}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} width={84} height={56} radius={R.md} />
        ))}
      </View>
      <Skeleton width="100%" height={16} style={{ marginTop: spacing(3) }} />
      <Skeleton width="92%" height={16} style={{ marginTop: 8 }} />
      <Skeleton width="100%" height={52} radius={R.md} style={{ marginTop: spacing(3) }} />
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: spacing(2.5), paddingTop: spacing(2) },

  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  card: {
    width: "48.5%",
    backgroundColor: colors.bg,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    marginBottom: spacing(2),
    overflow: "hidden",
  },
  cardBody: { padding: spacing(1.25) },
  cardFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing(1.5) },

  chips: { flexDirection: "row", gap: spacing(1), marginTop: spacing(1.5) },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.5),
    backgroundColor: colors.bg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    padding: spacing(1.5),
    marginBottom: spacing(1.25),
  },
  rowBody: { flex: 1 },

  block: {
    backgroundColor: colors.bg,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    padding: spacing(2),
    marginTop: spacing(1.5),
  },

  variantRow: { flexDirection: "row", gap: spacing(1.25), marginTop: spacing(2.5) },
});
