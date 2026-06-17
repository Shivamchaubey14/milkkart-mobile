import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";

import { useLazyMeQuery, useSendOtpMutation, useVerifyOtpMutation } from "../../api/baseApi";
import { Button } from "../../components/Button";
import { Screen } from "../../components/Screen";
import { TextField } from "../../components/TextField";
import { useAppDispatch } from "../../store/hooks";
import { setTokens, setUser } from "../../store/authSlice";
import { saveTokens } from "../../store/secureTokens";
import { colors, font, spacing } from "../../theme";

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

  async function onSend() {
    setError("");
    if (!phone.trim()) {
      setError("Please enter your phone number.");
      return;
    }
    try {
      await sendOtp({ phone: phone.trim() }).unwrap();
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
      const res = await verifyOtp({ phone: phone.trim(), code: code.trim() }).unwrap();
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
        <View style={styles.brand}>
          <Text style={styles.mark}>🥛</Text>
          <Text style={styles.brandName}>MilkKart</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Sign in</Text>
          <Text style={styles.subtitle}>
            {step === "phone"
              ? "Log in with your phone number and a one-time code."
              : "Enter the 6-digit code we sent you."}
          </Text>

          {step === "phone" ? (
            <>
              <TextField
                label="Phone number"
                value={phone}
                onChangeText={setPhone}
                placeholder="+919876543210"
                keyboardType="phone-pad"
                autoFocus
              />
              <Button title="Send OTP" onPress={onSend} loading={sending} />
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
              <Button title="Verify & continue" onPress={onVerify} loading={verifying} />
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
            </>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Text style={styles.devNote}>
            Your one-time code is emailed to you. In dev it's also printed in the backend logs.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: "center" },
  brand: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: spacing(3) },
  mark: { fontSize: 30, marginRight: spacing(1) },
  brandName: { fontSize: 26, fontWeight: "700", color: colors.green, letterSpacing: -0.5 },
  card: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    padding: spacing(3),
  },
  title: { fontSize: font.h1, fontWeight: "700", color: colors.heading },
  subtitle: { fontSize: font.body, color: colors.text, marginTop: spacing(0.5), marginBottom: spacing(2) },
  error: { color: colors.error, fontSize: font.small, marginTop: spacing(1.5) },
  devNote: {
    color: colors.muted,
    fontSize: font.tiny,
    marginTop: spacing(2),
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing(1.5),
  },
});
