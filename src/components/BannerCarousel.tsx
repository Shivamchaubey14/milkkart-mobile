import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import type { Banner } from "../api/baseApi";
import { colors, fonts, fontsAlt, spacing } from "../theme";

const SIDE = spacing(2.5); // matches the Home content horizontal padding
const CARD_W = Dimensions.get("window").width - SIDE * 2;
// Mobile banner slot ratio (width:height). The card sizes itself to the device
// width via aspectRatio, so it fits any screen. Designer banners exported at
// this ratio (e.g. 1080×540) fill it perfectly; the existing 5:1 web images are
// shown with `contain` so they aren't cropped (slight bands until re-exported).
const BANNER_RATIO = 2;

// Pull the hex stops out of a CSS string like "linear-gradient(120deg,#3bb77e,#1f8f5f)".
function gradientColors(bg: string): [string, string] {
  const hits = bg?.match(/#[0-9a-fA-F]{3,8}/g);
  if (hits && hits.length >= 2) return [hits[0], hits[1]];
  if (hits && hits.length === 1) return [hits[0], hits[0]];
  return [colors.green, colors.greenDark];
}

// Dark text on light backgrounds, white on dark — keep the title readable.
function readableText(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length < 6) return colors.white;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? colors.heading : colors.white;
}

function BannerCard({ banner }: { banner: Banner }) {
  if (banner.image_url) {
    return (
      <View style={styles.card}>
        <Image source={{ uri: banner.image_url }} style={styles.image} resizeMode="contain" />
      </View>
    );
  }

  const [from, to] = gradientColors(banner.bg_color);
  const fg = readableText(from);
  const subFg = fg === colors.white ? "rgba(255,255,255,0.9)" : colors.text;

  return (
    <LinearGradient colors={[from, to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
      <View style={styles.textWrap}>
        {banner.title ? (
          <Text style={[styles.title, { color: fg }]} numberOfLines={2}>
            {banner.title}
          </Text>
        ) : null}
        {banner.subtitle ? (
          <Text style={[styles.subtitle, { color: subFg }]} numberOfLines={2}>
            {banner.subtitle}
          </Text>
        ) : null}
        <Pressable style={[styles.cta, { backgroundColor: fg }]}>
          <Text style={[styles.ctaText, { color: from }]}>Shop now</Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

export function BannerCarousel({ banners }: { banners: Banner[] }) {
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const count = banners.length;

  // Auto-advance loop.
  useEffect(() => {
    if (count <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => {
        const next = (i + 1) % count;
        scrollRef.current?.scrollTo({ x: next * (CARD_W + spacing(1.5)), animated: true });
        return next;
      });
    }, 3500);
    return () => clearInterval(id);
  }, [count]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / (CARD_W + spacing(1.5)));
    if (i !== index) setIndex(i);
  };

  return (
    <View>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_W + spacing(1.5)}
        decelerationRate="fast"
        onMomentumScrollEnd={onScroll}
        contentContainerStyle={styles.track}
      >
        {banners.map((b) => (
          <BannerCard key={b.id} banner={b} />
        ))}
      </ScrollView>

      {count > 1 ? (
        <View style={styles.dots}>
          {banners.map((b, i) => (
            <View key={b.id} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { gap: spacing(1.5) },
  card: {
    width: CARD_W,
    aspectRatio: BANNER_RATIO,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: colors.bgSoft,
    justifyContent: "center",
  },
  image: { width: "100%", height: "100%" },
  textWrap: { padding: spacing(2.5) },
  title: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 27, maxWidth: "75%" },
  subtitle: { fontFamily: fontsAlt.regular, fontSize: 13, marginTop: spacing(0.5), maxWidth: "78%" },
  cta: {
    alignSelf: "flex-start",
    borderRadius: 10,
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(2),
    marginTop: spacing(1.5),
  },
  ctaText: { fontFamily: fonts.bold, fontSize: 13 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: spacing(1.5) },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.line },
  dotActive: { width: 18, backgroundColor: colors.green },
});
