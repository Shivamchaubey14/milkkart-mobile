import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useLanguage } from "../i18n/LanguageProvider";
import { LANGUAGES } from "../i18n/translations";
import { colors, fonts, fontsAlt, spacing } from "../theme";

// Language chooser shown on the rider card (dark surface). Two radio options —
// English / हिंदी — that switch the rider UI language instantly and persist.
export function LanguagePicker() {
  const { lang, setLang, t } = useLanguage();
  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Ionicons name="language-outline" size={13} color="rgba(255,255,255,0.7)" />
        <Text style={styles.label}>{t("language")}</Text>
      </View>
      <View style={styles.row}>
        {LANGUAGES.map((o) => {
          const on = lang === o.code;
          return (
            <Pressable
              key={o.code}
              style={[styles.opt, on && styles.optOn]}
              onPress={() => setLang(o.code)}
              hitSlop={6}
            >
              <View style={[styles.radio, on && styles.radioOn]}>
                {on ? <View style={styles.dot} /> : null}
              </View>
              <Text style={[styles.optText, on && styles.optTextOn]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing(1.75) },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: spacing(0.75) },
  label: {
    fontFamily: fontsAlt.extrabold,
    fontSize: 10,
    letterSpacing: 1,
    color: "rgba(255,255,255,0.7)",
  },
  row: { flexDirection: "row", gap: spacing(1) },
  opt: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: spacing(1.25),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  optOn: { borderColor: colors.green, backgroundColor: "rgba(59,183,126,0.18)" },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOn: { borderColor: colors.green },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green },
  optText: { fontFamily: fonts.semibold, fontSize: 14, color: "rgba(255,255,255,0.7)" },
  optTextOn: { color: colors.white, fontFamily: fonts.bold },
});
