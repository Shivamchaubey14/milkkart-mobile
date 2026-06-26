import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Location from "expo-location";
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import TrackingMap from "../components/TrackingMap";
import { useT } from "../i18n/LanguageProvider";
import type { RiderHomeStackParamList } from "../navigation/RiderHomeStack";
import { colors, fonts, fontsAlt, spacing } from "../theme";

type LatLng = { lat: number; lng: number };

// Full-screen navigation for an active delivery: the rider's live position and
// the drop destination on Google Maps (reusing TrackingMap), with a one-tap
// hand-off to Google Maps turn-by-turn — the native analogue of rider.html's
// in-place map + directions.
export default function RiderNavigateScreen() {
  const insets = useSafeAreaInsets();
  const t = useT();
  const navigation = useNavigation<NativeStackNavigationProp<RiderHomeStackParamList>>();
  const { orderNumber, address, destLat, destLng } =
    useRoute<RouteProp<RiderHomeStackParamList, "RiderNavigate">>().params;

  const dest: LatLng | null = destLat && destLng ? { lat: parseFloat(destLat), lng: parseFloat(destLng) } : null;

  const [me, setMe] = useState<LatLng | null>(null);
  const [denied, setDenied] = useState(false);
  const [eta, setEta] = useState("");

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        if (!cancelled) setDenied(true);
        return;
      }
      const cur = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if (!cancelled) setMe({ lat: cur.coords.latitude, lng: cur.coords.longitude });
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 15, timeInterval: 4000 },
        (p) => setMe({ lat: p.coords.latitude, lng: p.coords.longitude }),
      );
    })();
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, []);

  function openMaps() {
    const destination = dest ? `${dest.lat},${dest.lng}` : encodeURIComponent(address);
    // Universal Google Maps directions URL — opens the Maps app (or browser),
    // routing from the rider's current location to the drop.
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
    Linking.openURL(url).catch(() => {});
  }

  return (
    <View style={styles.flex}>
      {/* Map (or status) fills the screen behind the header/footer overlays. */}
      <View style={styles.flex}>
        {denied ? (
          <View style={styles.center}>
            <Ionicons name="location-outline" size={34} color={colors.muted} />
            <Text style={styles.centerText}>{t("locationNeeded")}</Text>
          </View>
        ) : me && dest ? (
          <TrackingMap rider={me} destination={dest} fill onEta={setEta} />
        ) : !dest ? (
          <View style={styles.center}>
            <Ionicons name="navigate-outline" size={34} color={colors.muted} />
            <Text style={styles.centerText}>{t("destinationUnavailable")}</Text>
          </View>
        ) : (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.green} />
            <Text style={styles.centerText}>{t("locatingYou")}</Text>
          </View>
        )}
      </View>

      {/* Header overlay */}
      <View style={[styles.header, { paddingTop: insets.top + spacing(1) }]}>
        <Pressable style={styles.back} onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={20} color={colors.heading} />
        </Pressable>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            #{orderNumber.slice(0, 8)}
          </Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {eta || t("deliverTo") + ": " + address}
          </Text>
        </View>
      </View>

      {/* Footer action — hand off to Google Maps turn-by-turn. */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing(1.5) }]}>
        <Text style={styles.footAddr} numberOfLines={2}>
          {address}
        </Text>
        <Pressable style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.9 }]} onPress={openMaps}>
          <Ionicons name="navigate" size={18} color={colors.white} />
          <Text style={styles.navBtnText}>{t("openInGoogleMaps")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bgSoft },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing(4), gap: spacing(1.25) },
  centerText: { fontFamily: fontsAlt.regular, fontSize: 14, color: colors.muted, textAlign: "center" },

  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.25),
    paddingHorizontal: spacing(2),
    paddingBottom: spacing(1.25),
    backgroundColor: "rgba(255,255,255,0.96)",
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  back: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.bgSoft, alignItems: "center", justifyContent: "center" },
  headerInfo: { flex: 1 },
  headerTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.heading },
  headerSub: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginTop: 1 },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing(2),
    paddingTop: spacing(1.75),
    backgroundColor: colors.bg,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    shadowColor: "#253d4e",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -3 },
    elevation: 8,
    gap: spacing(1.25),
  },
  footAddr: { fontFamily: fonts.semibold, fontSize: 14, color: colors.heading },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.green,
  },
  navBtnText: { fontFamily: fonts.bold, fontSize: 15, color: colors.white },
});
