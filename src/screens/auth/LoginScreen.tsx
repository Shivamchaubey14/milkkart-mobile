import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useLazyMeQuery, useSendOtpMutation, useVerifyOtpMutation } from "../../api/baseApi";
import { Button } from "../../components/Button";
import { BrandLogo } from "../../components/Logo";
import { Screen } from "../../components/Screen";
import { TextField } from "../../components/TextField";
import { useAppDispatch } from "../../store/hooks";
import { setTokens, setUser } from "../../store/authSlice";
import { saveTokens } from "../../store/secureTokens";
import { colors, font, fonts, fontsAlt, spacing } from "../../theme";

function apiError(e: any): string {
  return e?.data?.error || e?.data?.detail || "Something went wrong. Check your connection.";
}

export default function LoginScreen() {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const [sendOtp, { isLoading: sending }] = useSendOtpMutation();
  const [verifyOtp, { isLoading: verifying }] = useVerifyOtpMutation();
  const [fetchMe] = useLazyMeQuery();
  const dispatch = useAppDispatch();

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
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Green rounded card — logo chip, welcome heading, strapline. */}
          <View style={styles.heroCard}>
            <View style={styles.blobTop} />
            <View style={styles.blobBottom} />

            <View style={styles.logoChip}>
              <BrandLogo width={118} />
            </View>

            <Text style={styles.heroTitle}>
              {step === "phone" ? "Welcome back" : "Verify OTP"}
            </Text>
            <Text style={styles.heroSubtitle}>
              {step === "phone"
                ? "Fresh dairy products, delivered fast."
                : `Enter the 6-digit code we sent to ${fullPhone}.`}
            </Text>
          </View>

          {/* Form — on the white screen, below the green card. */}
          <View style={styles.body}>
            {step === "phone" ? (
              <>
                <Text style={styles.label}>Phone number</Text>
                <View style={styles.phoneRow}>
                  <View style={styles.country}>
                    <Text style={styles.flag}>🇮🇳</Text>
                    <Text style={styles.code}>+91</Text>
                    <Text style={styles.caret}>▾</Text>
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
                  We'll text a 6-digit code to verify it's you. Standard rates may apply.
                </Text>
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <Button title="Send OTP" onPress={onSend} loading={sending} style={styles.cta} />
              </>
            ) : (
              <>
                <TextField
                  label="Enter the 6-digit code"
                  value={code}
                  onChangeText={setCode}
                  placeholder="● ● ● ● ● ●"
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <Button
                  title="Verify & continue"
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
                  style={{ marginTop: spacing(0.5) }}
                />
                <Text style={styles.helper}>
                  Your one-time code is emailed to you. In dev it's also printed in the backend logs.
                </Text>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // Top-aligned: paddingTop is the single knob for how far down the green card
  // sits — lower it to push the card up, raise it to push down.
  scroll: { flexGrow: 1, justifyContent: "flex-start", paddingTop: spacing(5), paddingBottom: spacing(2) },

  // Green card — rounded on all corners, floating on the white screen.
  heroCard: {
    backgroundColor: colors.green,
    borderRadius: 28,
    paddingHorizontal: spacing(2),
    paddingTop: spacing(5),
    paddingBottom: spacing(3.5),
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
  heroTitle: {
    fontFamily: fonts.bold,
    fontSize: 30,
    color: colors.white,
    marginTop: spacing(2.5),
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontFamily: fontsAlt.regular,
    fontSize: font.body,
    color: "rgba(255,255,255,0.92)",
    marginTop: spacing(3),
    maxWidth: "82%",
    lineHeight: 21,
  },

  // Form ---------------------------------------------------------------------
  body: { paddingHorizontal: spacing(0.5), paddingTop: spacing(5) },
  label: { fontFamily: fonts.semibold, fontSize: font.body, color: colors.heading, marginBottom: spacing(1) },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.green,
    borderRadius: 14,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing(0.75),
    minHeight: 56,
  },
  country: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing(1) },
  flag: { fontSize: 18, marginRight: 6 },
  code: { fontFamily: fonts.semibold, fontSize: font.body, color: colors.heading },
  caret: { fontSize: 10, color: colors.muted, marginLeft: 4 },
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
  helper: {
    fontFamily: fontsAlt.regular,
    fontSize: font.small,
    color: colors.muted,
    marginTop: spacing(1.25),
    lineHeight: 19,
  },
  error: { color: colors.error, fontFamily: fontsAlt.regular, fontSize: font.small, marginTop: spacing(1.25) },
  cta: {
    marginTop: spacing(5),
    shadowColor: colors.green,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
});
