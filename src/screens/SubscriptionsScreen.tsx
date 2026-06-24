import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";

import { imageUrl } from "../api/config";

import {
  Subscription,
  useAddVacationMutation,
  useCancelSubscriptionMutation,
  usePauseSubscriptionMutation,
  useRemoveVacationMutation,
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

// Parse an ISO "YYYY-MM-DD" as a local date (avoids UTC off-by-one).
function parseISO(s: string) {
  return new Date(s + "T00:00:00");
}

function todayLocal() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
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
  const [removeVacation] = useRemoveVacationMutation();

  const [from, setFrom] = useState<Date | null>(null);
  const [to, setTo] = useState<Date | null>(null);
  const [picker, setPicker] = useState<"from" | "to" | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const img = imageUrl(sub.image_url);

  const s = STATUS[sub.status] ?? STATUS.active;
  const cancelled = sub.status === "cancelled";
  const paused = sub.status === "paused";
  const busy = pausing || resuming;

  // Vacations: which one is active today (deliveries paused), and is the sub on
  // vacation right now — so the user is clearly told.
  const today = todayLocal();
  const activeVac = sub.vacations.find((v) => parseISO(v.start_date) <= today && today <= parseISO(v.end_date));
  const onVacation = !cancelled && !!activeVac;

  async function removeVac(vacationId: number) {
    try {
      await removeVacation({ id: sub.id, vacationId }).unwrap();
      toast("Vacation removed.");
    } catch (e) {
      toast(apiErr(e), "error");
    }
  }

  async function togglePause() {
    try {
      if (paused) await resume(sub.id).unwrap();
      else await pause(sub.id).unwrap();
    } catch (e) {
      toast(apiErr(e), "error");
    }
  }

  async function doCancel() {
    setConfirmOpen(false);
    try {
      await cancel(sub.id).unwrap();
      toast("Subscription cancelled.");
    } catch (e) {
      toast(apiErr(e), "error");
    }
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
          {img ? (
            <Image source={{ uri: img }} style={styles.thumbImg} resizeMode="contain" />
          ) : (
            <Ionicons name="cube-outline" size={20} color={colors.green} />
          )}
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

      {onVacation ? (
        <View style={styles.vacBanner}>
          <Ionicons name="airplane" size={14} color={colors.green} />
          <Text style={styles.vacBannerText}>
            On vacation until {fmtDay(parseISO(activeVac!.end_date))} — deliveries paused.
          </Text>
        </View>
      ) : null}

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
            <ActionBtn icon="close" label="Cancel" tone="danger" onPress={() => setConfirmOpen(true)} />
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

          {sub.vacations.length > 0 ? (
            <View style={styles.vacList}>
              {sub.vacations.map((v) => {
                const vActive = parseISO(v.start_date) <= today && today <= parseISO(v.end_date);
                return (
                  <View key={v.id} style={styles.vacItem}>
                    <Ionicons
                      name="airplane-outline"
                      size={13}
                      color={vActive ? colors.green : colors.muted}
                    />
                    <Text style={styles.vacItemText}>
                      {fmtDay(parseISO(v.start_date))} – {fmtDay(parseISO(v.end_date))}
                    </Text>
                    {vActive ? <Text style={styles.vacItemActive}>Active</Text> : null}
                    <Pressable onPress={() => removeVac(v.id)} hitSlop={8}>
                      <Ionicons name="close" size={14} color={colors.muted} />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ) : null}
        </>
      )}

      {/* Branded cancel confirmation — replaces the native Alert (rounded, themed). */}
      <Modal
        transparent
        visible={confirmOpen}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setConfirmOpen(false)}
      >
        <Pressable style={styles.confirmBackdrop} onPress={() => setConfirmOpen(false)}>
          <Pressable style={styles.confirmCard} onPress={() => {}}>
            <View style={styles.confirmIcon}>
              <Ionicons name="close-circle" size={28} color={colors.error} />
            </View>
            <Text style={styles.confirmTitle}>Cancel subscription?</Text>
            <Text style={styles.confirmMsg}>Deliveries will stop. You can re-subscribe anytime.</Text>
            <View style={styles.confirmActions}>
              <Pressable style={styles.confirmKeep} onPress={() => setConfirmOpen(false)}>
                <Text style={styles.confirmKeepText}>Keep it</Text>
              </Pressable>
              <Pressable style={styles.confirmCancelBtn} onPress={doCancel}>
                <Text style={styles.confirmCancelText}>Cancel it</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
    overflow: "hidden",
  },
  thumbImg: { width: "100%", height: "100%" },
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

  // On-vacation banner + scheduled list
  vacBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: colors.greenTint,
    borderRadius: 12,
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(1.5),
    marginTop: spacing(1.5),
  },
  vacBannerText: { flex: 1, fontFamily: fonts.semibold, fontSize: 12.5, color: colors.green },
  vacList: { marginTop: spacing(1.5), gap: spacing(0.75) },
  vacItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.bgSoft,
    borderRadius: 10,
    paddingVertical: spacing(0.75),
    paddingHorizontal: spacing(1.25),
  },
  vacItemText: { flex: 1, fontFamily: fontsAlt.semibold, fontSize: 13, color: colors.heading },
  vacItemActive: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.green,
    backgroundColor: colors.greenTint,
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
    overflow: "hidden",
  },

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

  // Branded cancel-confirm modal
  confirmBackdrop: {
    flex: 1,
    backgroundColor: "rgba(37,61,78,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing(3),
  },
  confirmCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: colors.bg,
    borderRadius: 22,
    padding: spacing(3),
    alignItems: "center",
  },
  confirmIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.errorTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing(1.5),
  },
  confirmTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.heading, textAlign: "center" },
  confirmMsg: {
    fontFamily: fontsAlt.regular,
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 20,
    marginTop: spacing(1),
    marginBottom: spacing(2.5),
  },
  confirmActions: { flexDirection: "row", gap: spacing(1.25), alignSelf: "stretch" },
  confirmKeep: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.bgSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmKeepText: { fontFamily: fonts.bold, fontSize: 15, color: colors.heading },
  confirmCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmCancelText: { fontFamily: fonts.bold, fontSize: 15, color: colors.white },
});
