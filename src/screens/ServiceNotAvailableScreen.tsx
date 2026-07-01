import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useJoinWaitlistMutation, useLazyServiceabilityCheckQuery } from "../api/baseApi";
import { Button } from "../components/Button";
import { BrandLogo } from "../components/Logo";
import { Screen } from "../components/Screen";
import { useToast } from "../components/Toast";
import { setStoredPincode } from "../location/serviceability";
import { colors, font, fonts, fontsAlt, spacing } from "../theme";

function apiError(e: any): string {
  return (
    e?.data?.phone?.[0] ||
    e?.data?.pincode?.[0] ||
    e?.data?.error ||
    e?.data?.detail ||
    "Something went wrong. Check your connection."
  );
}

// Reassurance stats under the CTA — matches the storefront's "coming soon" copy.
const STATS: { value: string; label: string }[] = [
  { value: "40+", label: "cities\nlive" },
  { value: "12k+", label: "on\nwaitlist" },
  { value: "~4wk", label: "avg\nrollout" },
];

export default function ServiceNotAvailableScreen({
  detectedPincode,
  detectedCity,
  onServiceable,
}: {
  detectedPincode?: string;
  detectedCity?: string;
  // Called once the user picks a pincode we CAN deliver to, so the gate lets
  // them into the app.
  onServiceable: () => void;
}) {
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [joined, setJoined] = useState(false);

  // Where we currently think the user is — starts from the detected location and
  // updates as they try other pincodes.
  const [pincode, setPincode] = useState(detectedPincode ?? "");
  const [city, setCity] = useState(detectedCity ?? "");

  // "Check another pincode" inline editor.
  const [editing, setEditing] = useState(!detectedPincode);
  const [pinInput, setPinInput] = useState("");
  const [pinNote, setPinNote] = useState("");

  const [joinWaitlist, { isLoading: joining }] = useJoinWaitlistMutation();
  const [checkServiceability, { isLoading: checking }] = useLazyServiceabilityCheckQuery();

  const fullPhone = `+91${phone.trim()}`;
  const locationLabel = pincode
    ? `${city ? `${city} · ` : ""}${pincode}`
    : "Location not detected";

  async function onNotify() {
    setError("");
    if (phone.trim().length !== 10) {
      setError("Enter your 10-digit mobile number.");
      return;
    }
    try {
      await joinWaitlist({ phone: fullPhone, pincode: pincode || "000000", city }).unwrap();
      setJoined(true);
      toast("You're on the list! We'll text you the moment we go live in your area.");
    } catch (e) {
      setError(apiError(e));
    }
  }

  async function onCheckPincode() {
    setPinNote("");
    if (pinInput.trim().length < 4) {
      setPinNote("Enter a valid pincode.");
      return;
    }
    try {
      const res = await checkServiceability({ pincode: pinInput.trim() }).unwrap();
      if (res.serviceable) {
        await setStoredPincode(pinInput.trim());
        toast("Great news — we deliver there! Taking you in…");
        onServiceable();
      } else {
        // Still outside the zone — update what we show and let them join here.
        setPincode(pinInput.trim());
        setCity(res.area?.city ?? "");
        setEditing(false);
        setPinInput("");
        setJoined(false);
        setPinNote("");
      }
    } catch (e) {
      setPinNote(apiError(e));
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.screen, { paddingBottom: insets.bottom + spacing(2) }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Dark hero with a glowing location pin. */}
          <View style={styles.hero}>
            <View style={styles.blobTop} />
            <View style={styles.blobBottom} />
            <View style={styles.logoChip}>
              <BrandLogo width={96} />
            </View>
            <View style={styles.pinWrap}>
              <View style={styles.pinGlow} />
              <View style={styles.pinBadge}>
                <Ionicons name="location" size={30} color={colors.white} />
              </View>
            </View>
          </View>

          {/* Coming-soon eyebrow. */}
          <View style={styles.eyebrowWrap}>
            <View style={styles.eyebrow}>
              <Ionicons name="sparkles" size={12} color={colors.yellow} />
              <Text style={styles.eyebrowText}>COMING SOON</Text>
            </View>
          </View>

          <Text style={styles.title}>
            We're not in your area{"\n"}
            <Text style={styles.titleAlt}>just yet</Text>
          </Text>
          <Text style={styles.subtitle}>
            MilkKart doesn't deliver to your location yet — but we're expanding fast. Leave your
            number and we'll ping you the moment we arrive.
          </Text>

          {/* Detected location / pincode editor. */}
          <View style={styles.locCard}>
            {editing ? (
              <>
                <Text style={styles.locLabel}>CHECK A PINCODE</Text>
                <View style={styles.pinRow}>
                  <TextInput
                    style={styles.pinInput}
                    value={pinInput}
                    onChangeText={(t) => setPinInput(t.replace(/[^0-9]/g, "").slice(0, 6))}
                    placeholder="e.g. 226001"
                    placeholderTextColor={colors.muted}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                  />
                  <Pressable
                    style={styles.pinCheckBtn}
                    onPress={onCheckPincode}
                    disabled={checking}
                    hitSlop={6}
                  >
                    <Text style={styles.pinCheckText}>{checking ? "…" : "Check"}</Text>
                  </Pressable>
                </View>
                {pinNote ? <Text style={styles.pinNote}>{pinNote}</Text> : null}
                {detectedPincode ? (
                  <Pressable onPress={() => setEditing(false)} hitSlop={6}>
                    <Text style={styles.locChange}>Cancel</Text>
                  </Pressable>
                ) : null}
              </>
            ) : (
              <View style={styles.locRow}>
                <View style={styles.locIcon}>
                  <Ionicons name="navigate" size={16} color={colors.green} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.locLabel}>DETECTED LOCATION</Text>
                  <Text style={styles.locValue}>{locationLabel}</Text>
                </View>
                <Pressable onPress={() => setEditing(true)} hitSlop={8}>
                  <Text style={styles.locChange}>Change</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Waitlist capture. */}
          {joined ? (
            <View style={styles.joinedCard}>
              <View style={styles.joinedIcon}>
                <Ionicons name="checkmark-circle" size={22} color={colors.green} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.joinedTitle}>You're on the waitlist</Text>
                <Text style={styles.joinedSub}>
                  We'll notify {`+91 ${phone}`} when we start delivering to {pincode || "your area"}.
                </Text>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.phoneRow}>
                <View style={styles.country}>
                  <Text style={styles.flag}>🇮🇳</Text>
                  <Text style={styles.code}>+91</Text>
                </View>
                <View style={styles.divider} />
                <TextInput
                  style={styles.phoneInput}
                  value={phone}
                  onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, "").slice(0, 10))}
                  placeholder="Your mobile number"
                  placeholderTextColor={colors.muted}
                  keyboardType="phone-pad"
                />
              </View>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Button
                title="🔔  Notify me when live"
                onPress={onNotify}
                loading={joining}
                style={styles.cta}
              />
            </>
          )}

          {/* Secondary: check a different pincode. */}
          {!editing ? (
            <Pressable style={styles.checkAnother} onPress={() => setEditing(true)} hitSlop={8}>
              <Ionicons name="search" size={15} color={colors.green} />
              <Text style={styles.checkAnotherText}>Check another pincode</Text>
            </Pressable>
          ) : null}

          {/* Reassurance stats. */}
          <View style={styles.stats}>
            {STATS.map((s, i) => (
              <View key={s.value} style={[styles.stat, i < STATS.length - 1 && styles.statBorder]}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flexGrow: 1, paddingTop: spacing(1) },

  // Hero ----------------------------------------------------------------------
  hero: {
    backgroundColor: colors.heading,
    borderRadius: 26,
    height: 190,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  blobTop: {
    position: "absolute",
    top: -50,
    right: -40,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "rgba(59,183,126,0.16)",
  },
  blobBottom: {
    position: "absolute",
    bottom: -55,
    left: -45,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  logoChip: {
    position: "absolute",
    top: spacing(1.5),
    left: spacing(1.5),
    backgroundColor: colors.bg,
    borderRadius: 12,
    paddingVertical: spacing(0.75),
    paddingHorizontal: spacing(1.25),
  },
  pinWrap: { alignItems: "center", justifyContent: "center", marginTop: spacing(1.5) },
  pinGlow: {
    position: "absolute",
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(59,183,126,0.25)",
  },
  pinBadge: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.green,
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },

  // Eyebrow -------------------------------------------------------------------
  eyebrowWrap: { alignItems: "center", marginTop: spacing(2.5) },
  eyebrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.yellowTint,
    borderRadius: 999,
    paddingVertical: spacing(0.5),
    paddingHorizontal: spacing(1.25),
  },
  eyebrowText: {
    fontFamily: fontsAlt.extrabold,
    fontSize: font.tiny,
    letterSpacing: 1,
    color: colors.yellow,
  },

  title: {
    fontFamily: fonts.bold,
    fontSize: font.h1,
    color: colors.heading,
    textAlign: "center",
    marginTop: spacing(1.5),
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  titleAlt: { color: colors.green },
  subtitle: {
    fontFamily: fontsAlt.regular,
    fontSize: font.small,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 20,
    marginTop: spacing(1.25),
    paddingHorizontal: spacing(1),
  },

  // Location card -------------------------------------------------------------
  locCard: {
    borderWidth: 1.5,
    borderColor: colors.line,
    borderStyle: "dashed",
    borderRadius: 16,
    backgroundColor: colors.bgSoft,
    padding: spacing(1.5),
    marginTop: spacing(2.5),
  },
  locRow: { flexDirection: "row", alignItems: "center", gap: spacing(1.25) },
  locIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.greenTint,
    alignItems: "center",
    justifyContent: "center",
  },
  locLabel: {
    fontFamily: fontsAlt.extrabold,
    fontSize: font.tiny,
    letterSpacing: 0.8,
    color: colors.muted,
  },
  locValue: { fontFamily: fonts.bold, fontSize: font.body, color: colors.heading, marginTop: 2 },
  locChange: {
    fontFamily: fonts.bold,
    fontSize: font.small,
    color: colors.green,
    marginTop: spacing(1),
  },
  pinRow: { flexDirection: "row", alignItems: "center", gap: spacing(1), marginTop: spacing(1) },
  pinInput: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 17,
    color: colors.heading,
    backgroundColor: colors.bg,
    borderWidth: 1.5,
    borderColor: colors.green,
    borderRadius: 12,
    paddingVertical: spacing(1.25),
    paddingHorizontal: spacing(1.5),
    letterSpacing: 1,
  },
  pinCheckBtn: {
    backgroundColor: colors.green,
    borderRadius: 12,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(2),
  },
  pinCheckText: { fontFamily: fonts.bold, fontSize: font.body, color: colors.white },
  pinNote: {
    fontFamily: fontsAlt.regular,
    fontSize: font.small,
    color: colors.error,
    marginTop: spacing(1),
  },

  // Phone + CTA ---------------------------------------------------------------
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.green,
    borderRadius: 14,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing(0.75),
    minHeight: 52,
    marginTop: spacing(2),
  },
  country: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing(1) },
  flag: { fontSize: 18, marginRight: 6 },
  code: { fontFamily: fonts.semibold, fontSize: font.body, color: colors.heading },
  divider: { width: 1, height: 26, backgroundColor: colors.line, marginHorizontal: spacing(0.5) },
  phoneInput: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.heading,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(1),
  },
  error: { color: colors.error, fontFamily: fontsAlt.regular, fontSize: font.small, marginTop: spacing(1) },
  cta: {
    marginTop: spacing(1.5),
    shadowColor: colors.green,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },

  // Joined confirmation -------------------------------------------------------
  joinedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.25),
    backgroundColor: colors.greenTint,
    borderRadius: 14,
    padding: spacing(1.5),
    marginTop: spacing(2),
  },
  joinedIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  joinedTitle: { fontFamily: fonts.bold, fontSize: font.body, color: colors.heading },
  joinedSub: { fontFamily: fontsAlt.regular, fontSize: font.small, color: colors.text, marginTop: 2, lineHeight: 18 },

  // Secondary link ------------------------------------------------------------
  checkAnother: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: spacing(2),
  },
  checkAnotherText: { fontFamily: fonts.bold, fontSize: font.small, color: colors.green },

  // Stats ---------------------------------------------------------------------
  stats: {
    flexDirection: "row",
    backgroundColor: colors.bgSoft,
    borderRadius: 16,
    paddingVertical: spacing(1.75),
    marginTop: spacing(2.5),
  },
  stat: { flex: 1, alignItems: "center" },
  statBorder: { borderRightWidth: 1, borderRightColor: colors.line },
  statValue: { fontFamily: fonts.bold, fontSize: font.h2, color: colors.green },
  statLabel: {
    fontFamily: fontsAlt.regular,
    fontSize: font.tiny,
    color: colors.muted,
    textAlign: "center",
    marginTop: 2,
    lineHeight: 14,
  },
});
