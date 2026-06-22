import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLazyMeQuery, useSendOtpMutation, useVerifyOtpMutation } from "../../api/baseApi";
import { Button } from "../../components/Button";
import { BrandLogo } from "../../components/Logo";
import { Screen } from "../../components/Screen";
import { useToast } from "../../components/Toast";
import { useAppDispatch } from "../../store/hooks";
import { setTokens, setUser } from "../../store/authSlice";
import { saveTokens } from "../../store/secureTokens";
import { colors, font, fonts, fontsAlt, spacing } from "../../theme";

function apiError(e: any): string {
  return e?.data?.error || e?.data?.detail || "Something went wrong. Check your connection.";
}

// Selling points shown as pills inside the green hero card.
const FEATURES: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { icon: "flash", label: "30-min\ndelivery" },
  { icon: "leaf", label: "100%\nfarm fresh" },
  { icon: "repeat", label: "Daily\nsubscription" },
];

// Trust strip below the CTA — reassurance for first-time users.
const TRUST: { icon: keyof typeof Ionicons.glyphMap; title: string; sub: string }[] = [
  { icon: "calendar-outline", title: "Schedule daily deliveries", sub: "Milk & bread at your door each morning" },
  { icon: "wallet-outline", title: "Wallet & secure payments", sub: "UPI, cards & cash on delivery" },
];

export default function LoginScreen() {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const [sendOtp, { isLoading: sending }] = useSendOtpMutation();
  const [verifyOtp, { isLoading: verifying }] = useVerifyOtpMutation();
  const [fetchMe] = useLazyMeQuery();
  const dispatch = useAppDispatch();
  const toast = useToast();
  const insets = useSafeAreaInsets();

  // The field holds the 10-digit national number; the backend wants E.164.
  const fullPhone = `+91${phone.trim()}`;

  async function onSend() {
    setError("");
    if (phone.trim().length !== 10) {
      setError("Enter your 10-digit mobile number.");
      return;
    }
    try {
      await sendOtp({ phone: fullPhone }).unwrap();
      setStep("otp");
      toast("OTP Sent! Check your inbox — we've also sent it to your email too.");
    } catch (e) {
      setError(apiError(e));
    }
  }

  async function onVerify() {
    setError("");
    if (code.trim().length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    try {
      const res = await verifyOtp({ phone: fullPhone, code: code.trim() }).unwrap();
      await saveTokens(res.tokens.access, res.tokens.refresh);
      dispatch(setTokens({ access: res.tokens.access, refresh: res.tokens.refresh }));
      try {
        const me = await fetchMe().unwrap();
        dispatch(setUser(me));
      } catch {
        /* greeting is best-effort */
      }
      // Root navigator swaps to the main app once tokens are set.
    } catch (e) {
      setError(apiError(e));
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={[styles.screen, { paddingBottom: insets.bottom + spacing(1) }]}>
          {/* Green rounded card — logo chip, rating badge, welcome heading,
              strapline, and the feature pills. */}
          <View style={styles.heroCard}>
            <View style={styles.blobTop} />
            <View style={styles.blobBottom} />

            <View style={styles.heroTopRow}>
              <View style={styles.logoChip}>
                <BrandLogo width={104} />
              </View>
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={12} color={colors.yellow} />
                <Text style={styles.ratingText}>4.8 · 500+ users</Text>
              </View>
            </View>

            <Text style={styles.heroTitle}>
              {step === "phone" ? "Welcome back to\nfresh mornings" : "Verify your\nnumber"}
            </Text>
            <Text style={styles.heroSubtitle}>
              {step === "phone"
                ? "Fresh dairy products, delivered fast."
                : `Enter the 6-digit code we sent to ${fullPhone}.`}
            </Text>

            {step === "phone" ? (
              <View style={styles.featureRow}>
                {FEATURES.map((f) => (
                  <View key={f.icon} style={styles.feature}>
                    <View style={styles.featureIcon}>
                      <Ionicons name={f.icon} size={16} color={colors.white} />
                    </View>
                    <Text style={styles.featureLabel}>{f.label}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          {/* Form — on the white screen, below the green card. */}
          <View style={styles.body}>
            {step === "phone" ? (
              <>
                <Text style={styles.bodyTitle}>
                  Login <Text style={styles.bodyTitleAlt}>or Sign up</Text>
                </Text>
                <Text style={styles.bodyLead}>Enter your mobile number to continue</Text>

                <Text style={styles.label}>Phone number</Text>
                <View style={styles.phoneRow}>
                  <View style={styles.country}>
                    <Text style={styles.flag}>🇮🇳</Text>
                    <Text style={styles.code}>+91</Text>
                    <Ionicons name="chevron-down" size={14} color={colors.muted} style={styles.caret} />
                  </View>
                  <View style={styles.divider} />
                  <TextInput
                    style={styles.phoneInput}
                    value={phone}
                    onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, "").slice(0, 10))}
                    placeholder="98765 43210"
                    placeholderTextColor={colors.muted}
                    keyboardType="phone-pad"
                    autoFocus
                  />
                </View>
                <Text style={styles.helper}>
                  We'll send a 6-digit code to verify it's you. Standard rates may apply.
                </Text>
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <Button title="Send OTP  →" onPress={onSend} loading={sending} style={styles.cta} />

                {/* First-order promo — dashed accent card. */}
                <View style={styles.promo}>
                  <View style={styles.promoIcon}>
                    <Ionicons name="gift" size={18} color={colors.yellow} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.promoTitle}>Get ₹50 off your first order</Text>
                    <Text style={styles.promoSub}>Auto-applied for new users</Text>
                  </View>
                </View>

                {/* Trust strip. */}
                <View style={styles.trust}>
                  {TRUST.map((t) => (
                    <View key={t.title} style={styles.trustRow}>
                      <View style={styles.trustIcon}>
                        <Ionicons name={t.icon} size={18} color={colors.green} />
                      </View>
                      <View style={styles.flex}>
                        <Text style={styles.trustTitle}>{t.title}</Text>
                        <Text style={styles.trustSub}>{t.sub}</Text>
                      </View>
                    </View>
                  ))}
                </View>

              </>
            ) : (
              <>
                <Text style={styles.label}>Enter the 6-digit code</Text>
                <View style={styles.codeRow}>
                  <TextInput
                    style={styles.codeInput}
                    value={code}
                    onChangeText={(t) => setCode(t.replace(/[^0-9]/g, "").slice(0, 6))}
                    placeholder="••••••"
                    placeholderTextColor={colors.muted}
                    keyboardType="number-pad"
                    maxLength={6}
                    textAlign="center"
                    autoFocus
                  />
                </View>
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <Button
                  title="Verify & Continue"
                  onPress={onVerify}
                  loading={verifying}
                  style={styles.cta}
                />
                <Button
                  title="Use a different number"
                  variant="ghost"
                  onPress={() => {
                    setStep("phone");
                    setCode("");
                    setError("");
                  }}
                  style={{ marginTop: spacing(1) }}
                />
                <Text style={styles.helper}>
                  Your one-time code is emailed to you. In dev it's also printed in the backend logs.
                </Text>
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // Single-screen layout — fills the available height, no scrolling. The hero
  // sits at top; the body below flexes to fill and pins the terms to the bottom.
  screen: { flex: 1, paddingTop: spacing(1) },

  // Green card — rounded on all corners, floating on the white screen.
  heroCard: {
    backgroundColor: colors.green,
    borderRadius: 26,
    paddingHorizontal: spacing(2),
    paddingTop: spacing(1.75),
    paddingBottom: spacing(2.25),
    overflow: "hidden",
  },
  blobTop: {
    position: "absolute",
    top: -45,
    right: -35,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  blobBottom: {
    position: "absolute",
    bottom: -55,
    left: -40,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoChip: {
    alignSelf: "flex-start",
    backgroundColor: colors.bg,
    borderRadius: 14,
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(1.5),
    shadowColor: colors.heading,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 999,
    paddingVertical: spacing(0.5),
    paddingHorizontal: spacing(1),
  },
  ratingText: { fontFamily: fonts.semibold, fontSize: font.tiny, color: colors.white },
  heroTitle: {
    fontFamily: fonts.bold,
    fontSize: 25,
    color: colors.white,
    marginTop: spacing(1.75),
    letterSpacing: -0.3,
    lineHeight: 30,
  },
  heroSubtitle: {
    fontFamily: fontsAlt.regular,
    fontSize: font.small,
    color: "rgba(255,255,255,0.92)",
    marginTop: spacing(1),
    maxWidth: "82%",
    lineHeight: 19,
  },

  // Feature pills inside the hero.
  featureRow: { flexDirection: "row", gap: spacing(1), marginTop: spacing(2) },
  feature: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 14,
    paddingVertical: spacing(1.25),
    paddingHorizontal: spacing(0.5),
  },
  featureIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing(0.5),
  },
  featureLabel: {
    fontFamily: fonts.semibold,
    fontSize: font.tiny,
    color: colors.white,
    textAlign: "center",
    lineHeight: 15,
  },

  // Form ---------------------------------------------------------------------
  body: { flex: 1, paddingHorizontal: spacing(0.5), paddingTop: spacing(2) },
  bodyTitle: { fontFamily: fonts.bold, fontSize: font.h2, color: colors.heading },
  bodyTitleAlt: { color: colors.green },
  bodyLead: {
    fontFamily: fontsAlt.regular,
    fontSize: font.small,
    color: colors.muted,
    marginTop: spacing(0.25),
    marginBottom: spacing(1.5),
  },
  label: { fontFamily: fonts.semibold, fontSize: font.body, color: colors.heading, marginBottom: spacing(1) },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.green,
    borderRadius: 14,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing(0.75),
    minHeight: 52,
  },
  country: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing(1) },
  flag: { fontSize: 18, marginRight: 6 },
  code: { fontFamily: fonts.semibold, fontSize: font.body, color: colors.heading },
  caret: { marginLeft: 4 },
  divider: { width: 1, height: 26, backgroundColor: colors.line, marginHorizontal: spacing(0.5) },
  phoneInput: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 17,
    color: colors.heading,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(1),
    letterSpacing: 0.5,
  },
  // OTP code field — same green-bordered look as the phone field, centered.
  codeRow: {
    borderWidth: 1.5,
    borderColor: colors.green,
    borderRadius: 14,
    backgroundColor: colors.bg,
    minHeight: 56,
    justifyContent: "center",
  },
  codeInput: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.heading,
    letterSpacing: 8,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(1),
  },
  helper: {
    fontFamily: fontsAlt.regular,
    fontSize: font.small,
    color: colors.muted,
    marginTop: spacing(1),
    lineHeight: 18,
  },
  error: { color: colors.error, fontFamily: fontsAlt.regular, fontSize: font.small, marginTop: spacing(1) },
  cta: {
    marginTop: spacing(1.75),
    shadowColor: colors.green,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },

  // First-order promo — dashed accent card.
  promo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.25),
    marginTop: spacing(1.75),
    backgroundColor: colors.yellowTint,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.yellow,
    paddingVertical: spacing(1.25),
    paddingHorizontal: spacing(1.5),
  },
  promoIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  promoTitle: { fontFamily: fonts.bold, fontSize: font.small, color: colors.heading },
  promoSub: { fontFamily: fontsAlt.regular, fontSize: font.tiny, color: colors.muted, marginTop: 1 },

  // Trust strip.
  trust: { marginTop: spacing(1.75), gap: spacing(1.25) },
  trustRow: { flexDirection: "row", alignItems: "center", gap: spacing(1.25) },
  trustIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.greenTint,
    alignItems: "center",
    justifyContent: "center",
  },
  trustTitle: { fontFamily: fonts.semibold, fontSize: font.small, color: colors.heading },
  trustSub: { fontFamily: fontsAlt.regular, fontSize: font.tiny, color: colors.muted, marginTop: 1 },
});
