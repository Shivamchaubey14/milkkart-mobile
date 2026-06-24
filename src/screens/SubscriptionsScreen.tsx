import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";

import {
  Subscription,
  useAddVacationMutation,
  useCancelSubscriptionMutation,
  usePauseSubscriptionMutation,
  useResumeSubscriptionMutation,
  useSubscriptionSummaryQuery,
  useSubscriptionsQuery,
  useWalletQuery,
} from "../api/baseApi";
import { Screen } from "../components/Screen";
import { useToast } from "../components/Toast";
import type { ProfileStackParamList } from "../navigation/ProfileStack";
import { colors, fonts, fontsAlt, spacing } from "../theme";

const money = (n: number | string) => "₹" + Number(n).toFixed(2);
const QUICK = [200, 500, 1000];

const FREQ_LABEL: Record<string, string> = {
  daily: "Daily",
  alternate: "Alternate days",
  weekdays: "Weekdays",
  custom: "Custom",
};

const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  active: { label: "ACTIVE", bg: colors.greenTint, fg: colors.green },
  paused: { label: "PAUSED", bg: "#fff4d6", fg: "#b98421" },
  cancelled: { label: "CANCELLED", bg: colors.errorTint, fg: colors.error },
};

function apiErr(e: any): string {
  return e?.data?.error || e?.data?.detail || "Something went wrong. Try again.";
}

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtDay(d: Date) {
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function SubscriptionsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const toast = useToast();
  const { data: subs, isLoading } = useSubscriptionsQuery();
  const { data: summary } = useSubscriptionSummaryQuery();
  const { data: wallet } = useWalletQuery();
  const [amount, setAmount] = useState("");

  const list = subs ?? [];

  function addMoney() {
    // Top-up completes on the Wallet screen (full UPI / QR flow).
    navigation.navigate("Wallet");
  }

  function browse() {
    // Jump back to the Home tab to pick a product to subscribe to.
    navigation.getParent()?.navigate("Home" as never);
  }

  return (
    <Screen padded={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Dark header — title, catchy strapline, monthly stats. */}
        <View style={styles.header}>
          <View style={styles.blob} />
          <Text style={styles.headerTitle}>Subscriptions</Text>
          <Text style={styles.headerSub}>Subscribe once, never run out.</Text>

          <View style={styles.statsRow}>
            <Stat value={summary?.deliveries ?? 0} label="Deliveries" />
            <Stat value={summary?.skipped ?? 0} label="Skipped" />
            <Stat value={summary?.failed_balance ?? 0} label="Low bal" />
            <Stat value={summary ? money(summary.amount_spent) : "₹0"} label="Spent" accent />
          </View>
        </View>

        <View style={styles.body}>
          {/* Wallet balance — subscriptions are paid from here. */}
          <LinearGradient
            colors={[colors.green, colors.greenDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.walletCard}
          >
            <View style={styles.walletBlob} />
            <Text style={styles.walletLabel}>Wallet balance · pays your subscriptions</Text>
            <Text style={styles.walletValue}>{money(wallet?.balance ?? 0)}</Text>
          </LinearGradient>

          {/* Add money. */}
          <Text style={styles.sectionLabel}>Add money</Text>
          <View style={styles.quickRow}>
            {QUICK.map((q) => (
              <Pressable
                key={q}
                onPress={() => setAmount(String(q))}
                style={[styles.quickChip, amount === String(q) && styles.quickChipActive]}
              >
                <Text style={[styles.quickText, amount === String(q) && styles.quickTextActive]}>
                  +₹{q}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.addRow}>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={(v) => setAmount(v.replace(/[^0-9]/g, ""))}
              placeholder="Other amount"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
            />
            <Pressable style={styles.addBtn} onPress={addMoney}>
              <Text style={styles.addText}>Add money</Text>
            </Pressable>
          </View>

          {/* Subscriptions. */}
          <Text style={[styles.sectionLabel, { marginTop: spacing(3) }]}>Your subscriptions</Text>

          {isLoading ? (
            <ActivityIndicator color={colors.green} style={{ marginTop: spacing(3) }} />
          ) : list.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyBadge}>
                <Ionicons name="repeat-outline" size={30} color={colors.green} />
              </View>
              <Text style={styles.emptyTitle}>No subscriptions yet</Text>
              <Text style={styles.emptySub}>Subscribe to a product and it arrives fresh, on repeat.</Text>
            </View>
          ) : (
            list.map((sub) => <SubCard key={sub.id} sub={sub} onResubscribe={browse} />)
          )}

          {/* Browse footer. */}
          <Pressable style={styles.browseBtn} onPress={browse}>
            <Ionicons name="add" size={18} color={colors.green} />
            <Text style={styles.browseText}>Browse products to subscribe</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

function Stat({ value, label, accent }: { value: string | number; label: string; accent?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, accent && styles.statAccent]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SubCard({ sub, onResubscribe }: { sub: Subscription; onResubscribe: () => void }) {
  const toast = useToast();
  const [pause, { isLoading: pausing }] = usePauseSubscriptionMutation();
  const [resume, { isLoading: resuming }] = useResumeSubscriptionMutation();
  const [cancel] = useCancelSubscriptionMutation();
  const [addVacation, { isLoading: addingVac }] = useAddVacationMutation();

  const [from, setFrom] = useState<Date | null>(null);
  const [to, setTo] = useState<Date | null>(null);
  const [picker, setPicker] = useState<"from" | "to" | null>(null);

  const s = STATUS[sub.status] ?? STATUS.active;
  const cancelled = sub.status === "cancelled";
  const paused = sub.status === "paused";
  const busy = pausing || resuming;

  async function togglePause() {
    try {
      if (paused) await resume(sub.id).unwrap();
      else await pause(sub.id).unwrap();
    } catch (e) {
      toast(apiErr(e), "error");
    }
  }

  function confirmCancel() {
    Alert.alert("Cancel subscription?", "Deliveries will stop. You can re-subscribe anytime.", [
      { text: "Keep it", style: "cancel" },
      {
        text: "Cancel it",
        style: "destructive",
        onPress: async () => {
          try {
            await cancel(sub.id).unwrap();
            toast("Subscription cancelled.");
          } catch (e) {
            toast(apiErr(e), "error");
          }
        },
      },
    ]);
  }

  async function onAddVacation() {
    if (!from || !to) {
      toast("Pick both dates.", "info");
      return;
    }
    if (to < from) {
      toast("End date can't be before start.", "info");
      return;
    }
    try {
      await addVacation({ id: sub.id, start_date: isoDate(from), end_date: isoDate(to) }).unwrap();
      toast("Vacation added — deliveries paused for those days.");
      setFrom(null);
      setTo(null);
    } catch (e) {
      toast(apiErr(e), "error");
    }
  }

  return (
    <View style={[styles.card, cancelled && styles.cardMuted]}>
      <View style={styles.cardTop}>
        <View style={styles.thumb}>
          <Ionicons name="cube-outline" size={20} color={colors.green} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {sub.product_name} - {sub.variant_label}
          </Text>
          <Text style={styles.cardMeta}>
            Qty {sub.quantity} · {FREQ_LABEL[sub.frequency] ?? sub.frequency} · {money(sub.daily_cost)}/delivery
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: s.bg }]}>
          <Text style={[styles.badgeText, { color: s.fg }]}>{s.label}</Text>
        </View>
      </View>

      {cancelled ? (
        <View style={styles.cancelledRow}>
          <Text style={styles.cancelledText}>This subscription is cancelled.</Text>
          <Pressable onPress={onResubscribe} hitSlop={8}>
            <Text style={styles.resumeLink}>Re-subscribe</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.actions}>
            <ActionBtn
              icon={paused ? "play" : "pause"}
              label={paused ? "Resume" : "Pause"}
              onPress={togglePause}
              loading={busy}
            />
            <ActionBtn icon="calendar-outline" label="Calendar" onPress={() => toast("Delivery calendar — coming soon.")} />
            <ActionBtn icon="close" label="Cancel" tone="danger" onPress={confirmCancel} />
          </View>

          {/* Vacation. */}
          <Text style={styles.vacLabel}>Add vacation</Text>
          <View style={styles.vacRow}>
            <Pressable style={styles.dateBtn} onPress={() => setPicker("from")}>
              <Ionicons name="calendar-outline" size={14} color={colors.muted} />
              <Text style={[styles.dateText, from && styles.dateTextSet]}>{from ? fmtDay(from) : "From"}</Text>
            </Pressable>
            <Pressable style={styles.dateBtn} onPress={() => setPicker("to")}>
              <Ionicons name="calendar-outline" size={14} color={colors.muted} />
              <Text style={[styles.dateText, to && styles.dateTextSet]}>{to ? fmtDay(to) : "To"}</Text>
            </Pressable>
            <Pressable style={styles.vacAddBtn} onPress={onAddVacation} disabled={addingVac}>
              {addingVac ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.vacAddText}>Add</Text>
              )}
            </Pressable>
          </View>

          {picker ? (
            <DateTimePicker
              value={(picker === "from" ? from : to) ?? new Date()}
              mode="date"
              minimumDate={new Date()}
              onChange={(e, d) => {
                setPicker(null);
                if (e.type === "set" && d) {
                  if (picker === "from") setFrom(d);
                  else setTo(d);
                }
              }}
            />
          ) : null}
        </>
      )}
    </View>
  );
}

function ActionBtn({
  icon,
  label,
  onPress,
  tone,
  loading,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
  tone?: "danger";
  loading?: boolean;
}) {
  const danger = tone === "danger";
  return (
    <Pressable
      style={({ pressed }) => [styles.actionBtn, danger && styles.actionDanger, pressed && { opacity: 0.7 }]}
      onPress={onPress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.green} />
      ) : (
        <>
          <Ionicons name={icon} size={15} color={danger ? colors.error : colors.heading} />
          <Text style={[styles.actionText, danger && { color: colors.error }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing(4) },

  header: {
    backgroundColor: colors.heading,
    borderRadius: 26,
    marginHorizontal: spacing(2.5),
    marginTop: spacing(1),
    paddingHorizontal: spacing(2.5),
    paddingTop: spacing(2.5),
    paddingBottom: spacing(2.5),
    overflow: "hidden",
  },
  blob: {
    position: "absolute",
    top: -45,
    right: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  headerTitle: { fontFamily: fonts.bold, fontSize: 22, color: colors.white },
  headerSub: { fontFamily: fontsAlt.regular, fontSize: 13, color: colors.green, marginTop: 3 },

  statsRow: { flexDirection: "row", gap: spacing(1), marginTop: spacing(2.5) },
  stat: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    paddingVertical: spacing(1.25),
    alignItems: "center",
  },
  statValue: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },
  statAccent: { color: colors.yellow },
  statLabel: { fontFamily: fontsAlt.regular, fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 2 },

  body: { paddingHorizontal: spacing(2.5), paddingTop: spacing(2) },

  walletCard: { borderRadius: 18, padding: spacing(2), overflow: "hidden" },
  walletBlob: {
    position: "absolute",
    bottom: -50,
    right: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  walletLabel: { fontFamily: fontsAlt.regular, fontSize: 12, color: "rgba(255,255,255,0.9)" },
  walletValue: { fontFamily: fonts.bold, fontSize: 28, color: colors.white, marginTop: spacing(0.5) },

  sectionLabel: { fontFamily: fonts.bold, fontSize: 16, color: colors.heading, marginTop: spacing(2.5), marginBottom: spacing(1.25) },
  quickRow: { flexDirection: "row", gap: spacing(1) },
  quickChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing(1.25),
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.bg,
  },
  quickChipActive: { borderColor: colors.green, backgroundColor: colors.greenTint },
  quickText: { fontFamily: fonts.bold, fontSize: 14, color: colors.heading },
  quickTextActive: { color: colors.green },
  addRow: { flexDirection: "row", gap: spacing(1), marginTop: spacing(1.25) },
  amountInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: spacing(1.5),
    height: 48,
    fontFamily: fontsAlt.semibold,
    fontSize: 15,
    color: colors.heading,
  },
  addBtn: {
    backgroundColor: colors.green,
    borderRadius: 12,
    paddingHorizontal: spacing(2.5),
    alignItems: "center",
    justifyContent: "center",
  },
  addText: { fontFamily: fonts.bold, fontSize: 14, color: colors.white },

  // Subscription card
  card: {
    backgroundColor: colors.bg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    padding: spacing(2),
    marginBottom: spacing(1.5),
  },
  cardMuted: { backgroundColor: colors.bgSoft },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing(1.25) },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.greenTint,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.heading },
  cardMeta: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginTop: 3 },
  badge: { borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8 },
  badgeText: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 0.4 },

  actions: { flexDirection: "row", gap: spacing(1), marginTop: spacing(1.75) },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    height: 40,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.bg,
  },
  actionDanger: { borderColor: colors.errorTint, backgroundColor: colors.errorTint },
  actionText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.heading },

  vacLabel: { fontFamily: fonts.semibold, fontSize: 12, color: colors.muted, marginTop: spacing(1.75), marginBottom: spacing(1) },
  vacRow: { flexDirection: "row", gap: spacing(1), alignItems: "center" },
  dateBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 42,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.bgSoft,
    paddingHorizontal: spacing(1.25),
  },
  dateText: { fontFamily: fontsAlt.semibold, fontSize: 13, color: colors.muted },
  dateTextSet: { color: colors.heading },
  vacAddBtn: {
    height: 42,
    paddingHorizontal: spacing(2.5),
    borderRadius: 11,
    backgroundColor: colors.heading,
    alignItems: "center",
    justifyContent: "center",
  },
  vacAddText: { fontFamily: fonts.bold, fontSize: 14, color: colors.white },

  cancelledRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing(1.5),
  },
  cancelledText: { fontFamily: fontsAlt.regular, fontSize: 13, color: colors.muted },
  resumeLink: { fontFamily: fonts.bold, fontSize: 14, color: colors.green },

  // Empty
  empty: { alignItems: "center", paddingVertical: spacing(3) },
  emptyBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.greenTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing(1.5),
  },
  emptyTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.heading },
  emptySub: {
    fontFamily: fontsAlt.regular,
    fontSize: 13,
    color: colors.muted,
    marginTop: spacing(0.5),
    textAlign: "center",
    paddingHorizontal: spacing(3),
  },

  browseBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.green,
    marginTop: spacing(1.5),
  },
  browseText: { fontFamily: fonts.bold, fontSize: 15, color: colors.green },
});
