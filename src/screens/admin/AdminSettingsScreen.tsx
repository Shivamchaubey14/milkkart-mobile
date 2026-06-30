import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { useAdminSettingsQuery, useAdminUpdateSettingsMutation } from "../../api/baseApi";
import { Screen } from "../../components/Screen";
import { useToast } from "../../components/Toast";
import { colors, fonts, fontsAlt, spacing } from "../../theme";

const pad = (n: number) => String(n).padStart(2, "0");
function timeToDate(hhmmss: string) {
  const [h, m] = (hhmmss || "00:00:00").split(":").map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}
const fmtTime = (d: Date) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
const toHHMM = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export default function AdminSettingsScreen() {
  const navigation = useNavigation();
  const toast = useToast();
  const { data, isLoading } = useAdminSettingsQuery();
  const [save, { isLoading: saving }] = useAdminUpdateSettingsMutation();

  const [freeThreshold, setFreeThreshold] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("");
  const [smallCartThreshold, setSmallCartThreshold] = useState("");
  const [smallCartFee, setSmallCartFee] = useState("");
  const [taxPercent, setTaxPercent] = useState("");
  const [windowEnabled, setWindowEnabled] = useState(false);
  const [start, setStart] = useState<Date>(timeToDate("06:00:00"));
  const [end, setEnd] = useState<Date>(timeToDate("10:00:00"));
  const [picker, setPicker] = useState<"start" | "end" | null>(null);

  useEffect(() => {
    if (!data) return;
    setFreeThreshold(String(Number(data.free_delivery_threshold)));
    setDeliveryFee(String(Number(data.delivery_fee)));
    setSmallCartThreshold(String(Number(data.small_cart_threshold)));
    setSmallCartFee(String(Number(data.small_cart_fee)));
    setTaxPercent(String(Number(data.tax_percent)));
    setWindowEnabled(data.next_day_enabled);
    setStart(timeToDate(data.next_day_window_start));
    setEnd(timeToDate(data.next_day_window_end));
  }, [data]);

  function onPick(e: DateTimePickerEvent, d?: Date) {
    const which = picker;
    setPicker(null);
    if (e.type !== "set" || !d) return;
    if (which === "start") setStart(d);
    else setEnd(d);
  }

  async function onSave() {
    try {
      await save({
        free_delivery_threshold: freeThreshold || "0",
        delivery_fee: deliveryFee || "0",
        small_cart_threshold: smallCartThreshold || "0",
        small_cart_fee: smallCartFee || "0",
        tax_percent: taxPercent || "0",
        next_day_enabled: windowEnabled,
        next_day_window_start: toHHMM(start),
        next_day_window_end: toHHMM(end),
      }).unwrap();
      toast("Settings saved. Customers see this immediately.");
    } catch (e: any) {
      toast(e?.data?.detail || "Couldn't save the settings.", "error");
    }
  }

  return (
    <Screen padded={false} style={{ backgroundColor: colors.bgSoft }}>
      <View style={styles.header}>
        <View style={styles.blob} />
        <View style={styles.headerRow}>
          <Pressable style={styles.back} onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="arrow-back" size={20} color={colors.white} />
          </Pressable>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>
      </View>

      {isLoading || !data ? (
        <ActivityIndicator color={colors.green} style={{ marginTop: spacing(5) }} />
      ) : (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {/* Store fees */}
          <Text style={styles.section}>STORE FEES</Text>
          <View style={styles.card}>
            <Field label="Free delivery above" unit="₹" value={freeThreshold} onChange={setFreeThreshold} />
            <Field label="Delivery fee" unit="₹" value={deliveryFee} onChange={setDeliveryFee} />
            <Field label="Small-cart threshold" unit="₹" value={smallCartThreshold} onChange={setSmallCartThreshold} />
            <Field label="Small-cart fee" unit="₹" value={smallCartFee} onChange={setSmallCartFee} />
            <Field label="Tax" unit="%" value={taxPercent} onChange={setTaxPercent} last />
          </View>
          <Text style={styles.hint}>Set any amount to 0 to switch that fee off.</Text>

          {/* Next-day ordering window */}
          <Text style={styles.section}>NEXT-DAY ORDERING WINDOW</Text>
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Allow next-day pre-orders</Text>
              <Switch value={windowEnabled} onValueChange={setWindowEnabled} trackColor={{ true: colors.green }} thumbColor={colors.white} />
            </View>
            <View style={[styles.timeRow, !windowEnabled && { opacity: 0.45 }]} pointerEvents={windowEnabled ? "auto" : "none"}>
              <Pressable style={styles.timeBtn} onPress={() => setPicker("start")}>
                <Text style={styles.timeCap}>OPENS</Text>
                <Text style={styles.timeVal}>{fmtTime(start)}</Text>
              </Pressable>
              <Pressable style={styles.timeBtn} onPress={() => setPicker("end")}>
                <Text style={styles.timeCap}>CLOSES</Text>
                <Text style={styles.timeVal}>{fmtTime(end)}</Text>
              </Pressable>
            </View>
          </View>
          <Text style={styles.hint}>
            When enabled, customers can place orders for next-day delivery only between these times each day. Instant
            ordering stays available all day.
          </Text>

          {picker ? (
            <DateTimePicker value={picker === "start" ? start : end} mode="time" display={Platform.OS === "ios" ? "spinner" : "clock"} onChange={onPick} />
          ) : null}

          <Pressable style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={onSave} disabled={saving}>
            <Text style={styles.saveText}>{saving ? "Saving…" : "Save settings"}</Text>
          </Pressable>
        </ScrollView>
      )}
    </Screen>
  );
}

function Field({ label, unit, value, onChange, last }: { label: string; unit: string; value: string; onChange: (s: string) => void; last?: boolean }) {
  return (
    <View style={[styles.fieldRow, !last && styles.fieldBorder]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputWrap}>
        <Text style={styles.unit}>{unit}</Text>
        <TextInput style={styles.input} value={value} onChangeText={onChange} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.muted} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.heading, borderRadius: 26, marginHorizontal: spacing(2.5), marginTop: spacing(1),
    paddingHorizontal: spacing(2.5), paddingTop: spacing(2.5), paddingBottom: spacing(2.5), overflow: "hidden",
  },
  blob: { position: "absolute", top: -45, right: -30, width: 150, height: 150, borderRadius: 75, backgroundColor: "rgba(255,255,255,0.06)" },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing(1.5) },
  back: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: fonts.bold, fontSize: 22, color: colors.white },

  body: { paddingHorizontal: spacing(2.5), paddingTop: spacing(2), paddingBottom: spacing(5) },
  section: { fontFamily: fontsAlt.extrabold, fontSize: 11, letterSpacing: 0.8, color: colors.muted, marginTop: spacing(2.5), marginBottom: spacing(1) },
  card: { backgroundColor: colors.bg, borderRadius: 16, borderWidth: 1, borderColor: colors.lineSoft, paddingHorizontal: spacing(1.75) },
  hint: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginTop: spacing(1), lineHeight: 18 },

  fieldRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing(1.5) },
  fieldBorder: { borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  fieldLabel: { flex: 1, fontFamily: fonts.semibold, fontSize: 14, color: colors.heading },
  inputWrap: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.bgSoft, borderRadius: 10, paddingHorizontal: spacing(1.25), minWidth: 92 },
  unit: { fontFamily: fonts.bold, fontSize: 14, color: colors.muted },
  input: { flex: 1, paddingVertical: spacing(1), fontFamily: fonts.bold, fontSize: 15, color: colors.heading, textAlign: "right" },

  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing(1.5) },
  switchLabel: { fontFamily: fonts.semibold, fontSize: 14, color: colors.heading },
  timeRow: { flexDirection: "row", gap: spacing(1.25), paddingBottom: spacing(1.75) },
  timeBtn: { flex: 1, backgroundColor: colors.bgSoft, borderRadius: 12, borderWidth: 1, borderColor: colors.line, paddingHorizontal: spacing(1.5), paddingVertical: spacing(1.25) },
  timeCap: { fontFamily: fontsAlt.extrabold, fontSize: 9, letterSpacing: 0.6, color: colors.muted },
  timeVal: { fontFamily: fonts.bold, fontSize: 15, color: colors.heading, marginTop: 2 },

  saveBtn: { backgroundColor: colors.green, borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center", marginTop: spacing(3) },
  saveText: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },
});
