import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useMeQuery } from "../api/baseApi";
import { Screen } from "../components/Screen";
import { useToast } from "../components/Toast";
import { colors, fonts, fontsAlt, spacing } from "../theme";

const money = (n: number) => "₹" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function todayLabel() {
  const d = new Date();
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

// Mock data for the first cut — the live wiring lands in a later slice.
const STATS = { delivered: 18, pending: 4, earnings: 420 };
const COD = { toCollect: 560, collected: 1840 };
const CURRENT = {
  order: "a91f02c4",
  name: "Aarav Sharma",
  address: "Ram ji samosa, Faizabad 224001",
  amount: 92.9,
  km: 1.2,
};
const UPCOMING = [
  { id: 1, name: "Priya Nair", address: "Civil Lines, Faizabad 224001", amount: 148, pay: "prepaid" as const },
  { id: 2, name: "Rahul Verma", address: "Nijawant, Faizabad 224001 · 3.1 km", amount: 467.1, pay: "cod" as const },
];

export default function RiderHomeScreen() {
  const toast = useToast();
  const { data: me } = useMeQuery();
  const [onDuty, setOnDuty] = useState(true);

  const name = me?.name || "Rider";
  const initial = (name[0] || "R").toUpperCase();
  const soon = (what: string) => () => toast(`${what} — coming soon.`, "info");

  return (
    <Screen padded={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Rider identity + duty toggle */}
        <View style={styles.riderCard}>
          <View style={styles.blob} />
          <View style={styles.riderTop}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <View style={styles.riderInfo}>
              <Text style={styles.riderName} numberOfLines={1}>{name}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>Rider ID · MK-2048</Text>
                <Ionicons name="star" size={12} color={colors.yellow} style={{ marginLeft: 6 }} />
                <Text style={styles.ratingText}>4.3</Text>
              </View>
            </View>
            <Pressable hitSlop={8} onPress={soon("Notifications")}>
              <Ionicons name="notifications-outline" size={20} color={colors.white} />
            </Pressable>
          </View>

          <View style={styles.dutyRow}>
            {onDuty ? (
              <>
                <View style={[styles.dutyPill, styles.dutyOn]}>
                  <View style={styles.dutyDot} />
                  <Text style={styles.dutyTextOn}>On duty</Text>
                </View>
                <Pressable style={[styles.dutyPill, styles.dutyGhost]} onPress={() => setOnDuty(false)}>
                  <Text style={styles.dutyTextGhost}>Go off duty</Text>
                </Pressable>
              </>
            ) : (
              <>
                <View style={[styles.dutyPill, styles.dutyGhost]}>
                  <Text style={styles.dutyTextGhost}>Off duty</Text>
                </View>
                <Pressable style={[styles.dutyPill, styles.dutyOn]} onPress={() => setOnDuty(true)}>
                  <Text style={styles.dutyTextOn}>Go on duty</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>

        {/* Today's snapshot */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Today</Text>
          <Text style={styles.sectionMeta}>{todayLabel()}</Text>
        </View>
        <View style={styles.statRow}>
          <StatCard icon="checkmark-done" bg={colors.greenTint} fg={colors.green} value={String(STATS.delivered)} label="Delivered" />
          <StatCard icon="time-outline" bg="#fff4d6" fg="#b98421" value={String(STATS.pending)} label="Pending" />
          <StatCard icon="cash-outline" bg={colors.greenTint} fg={colors.green} value={money(STATS.earnings)} label="Earnings" />
        </View>

        {/* Cash on delivery */}
        <View style={styles.codCard}>
          <Text style={styles.codLabel}>CASH ON DELIVERY</Text>
          <View style={styles.codRow}>
            <View style={styles.codCol}>
              <Text style={styles.codColLabel}>To collect</Text>
              <Text style={styles.codAmount}>{money(COD.toCollect)}</Text>
            </View>
            <View style={styles.codCol}>
              <Text style={styles.codColLabel}>Collected</Text>
              <Text style={[styles.codAmount, { color: colors.white }]}>{money(COD.collected)}</Text>
            </View>
          </View>
          <Pressable style={styles.settleBtn} onPress={soon("Deposit")}>
            <Text style={styles.settleText}>Deposit pending to MilkKart</Text>
            <View style={styles.settleRight}>
              <Text style={styles.settleAction}>Settle</Text>
              <Ionicons name="arrow-forward" size={15} color={colors.white} />
            </View>
          </Pressable>
        </View>

        {/* Active deliveries */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Active deliveries</Text>
          <Text style={styles.pendingPill}>{STATS.pending} PENDING</Text>
        </View>

        {/* Current delivery */}
        <View style={styles.currentCard}>
          <View style={styles.currentTop}>
            <Text style={styles.currentTag}>● CURRENT · {CURRENT.km} KM AWAY</Text>
            <Text style={styles.orderNo}>#{CURRENT.order}</Text>
          </View>
          <View style={styles.currentBody}>
            <View style={styles.currentAvatar}>
              <Text style={styles.currentAvatarText}>{CURRENT.name[0]}</Text>
            </View>
            <View style={styles.currentInfo}>
              <Text style={styles.deliveryName}>{CURRENT.name}</Text>
              <Text style={styles.deliveryAddr} numberOfLines={1}>{CURRENT.address}</Text>
            </View>
            <Text style={styles.deliveryAmount}>{money(CURRENT.amount)}</Text>
          </View>
          <View style={styles.actionRow}>
            <Pressable style={styles.navigateBtn} onPress={soon("Navigation")}>
              <Ionicons name="navigate-outline" size={16} color={colors.green} />
              <Text style={styles.navigateText}>Navigate</Text>
            </Pressable>
            <Pressable style={styles.callBtn} onPress={soon("Call")}>
              <Ionicons name="call" size={17} color={colors.green} />
            </Pressable>
            <Pressable style={styles.deliveredBtn} onPress={soon("Mark delivered")}>
              <Text style={styles.deliveredText}>Delivered</Text>
            </Pressable>
          </View>
        </View>

        {/* Upcoming deliveries */}
        {UPCOMING.map((d) => (
          <View key={d.id} style={styles.deliveryRow}>
            <View style={styles.rowAvatar}>
              <Text style={styles.rowAvatarText}>{d.name[0]}</Text>
            </View>
            <View style={styles.rowInfo}>
              <View style={styles.rowNameLine}>
                <Text style={styles.deliveryName}>{d.name}</Text>
                <View style={[styles.payPill, d.pay === "cod" ? styles.payCod : styles.payPrepaid]}>
                  <Text style={[styles.payText, d.pay === "cod" ? styles.payTextCod : styles.payTextPrepaid]}>
                    {d.pay === "cod" ? "COD" : "PREPAID"}
                  </Text>
                </View>
              </View>
              <Text style={styles.deliveryAddr} numberOfLines={1}>{d.address}</Text>
            </View>
            <Text style={styles.deliveryAmount}>{money(d.amount)}</Text>
          </View>
        ))}

        <Pressable style={styles.viewAllBtn} onPress={soon("All deliveries")}>
          <Text style={styles.viewAllText}>View all deliveries</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function StatCard({
  icon,
  bg,
  fg,
  value,
  label,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  bg: string;
  fg: string;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={16} color={fg} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing(2.5), paddingTop: spacing(1), paddingBottom: spacing(4) },

  // Rider identity card
  riderCard: { backgroundColor: colors.heading, borderRadius: 22, padding: spacing(2.25), overflow: "hidden" },
  blob: { position: "absolute", top: -40, right: -28, width: 130, height: 130, borderRadius: 65, backgroundColor: "rgba(255,255,255,0.05)" },
  riderTop: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.green, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: fonts.bold, fontSize: 20, color: colors.white },
  riderInfo: { flex: 1, marginLeft: spacing(1.5) },
  riderName: { fontFamily: fonts.bold, fontSize: 17, color: colors.white },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  metaText: { fontFamily: fontsAlt.regular, fontSize: 12, color: "rgba(255,255,255,0.6)" },
  ratingText: { fontFamily: fonts.bold, fontSize: 12, color: colors.yellow, marginLeft: 3 },
  dutyRow: { flexDirection: "row", gap: spacing(1.25), marginTop: spacing(2) },
  dutyPill: { flex: 1, height: 40, borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  dutyOn: { backgroundColor: colors.green },
  dutyGhost: { backgroundColor: "rgba(255,255,255,0.08)" },
  dutyDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.white },
  dutyTextOn: { fontFamily: fonts.bold, fontSize: 14, color: colors.white },
  dutyTextGhost: { fontFamily: fonts.bold, fontSize: 14, color: "rgba(255,255,255,0.7)" },

  // Section headers
  sectionHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: spacing(2.75), marginBottom: spacing(1.25) },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.heading },
  sectionMeta: { fontFamily: fontsAlt.regular, fontSize: 13, color: colors.muted },
  pendingPill: { fontFamily: fontsAlt.extrabold, fontSize: 11, letterSpacing: 0.5, color: "#b98421" },

  // Stat cards
  statRow: { flexDirection: "row", gap: spacing(1.25) },
  statCard: { flex: 1, backgroundColor: colors.bg, borderRadius: 16, borderWidth: 1, borderColor: colors.lineSoft, padding: spacing(1.5), alignItems: "flex-start" },
  statIcon: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center", marginBottom: spacing(1) },
  statValue: { fontFamily: fonts.bold, fontSize: 19, color: colors.heading },
  statLabel: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginTop: 1 },

  // Cash-on-delivery card
  codCard: { backgroundColor: colors.heading, borderRadius: 18, padding: spacing(2), marginTop: spacing(2.5), overflow: "hidden" },
  codLabel: { fontFamily: fontsAlt.extrabold, fontSize: 11, letterSpacing: 1, color: "rgba(255,255,255,0.55)" },
  codRow: { flexDirection: "row", marginTop: spacing(1.5) },
  codCol: { flex: 1 },
  codColLabel: { fontFamily: fontsAlt.regular, fontSize: 12, color: "rgba(255,255,255,0.6)" },
  codAmount: { fontFamily: fonts.bold, fontSize: 22, color: colors.yellow, marginTop: 3 },
  settleBtn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.green, borderRadius: 12, paddingVertical: spacing(1.5), paddingHorizontal: spacing(1.75), marginTop: spacing(2) },
  settleText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.white },
  settleRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  settleAction: { fontFamily: fonts.bold, fontSize: 14, color: colors.white },

  // Current delivery
  currentCard: { backgroundColor: colors.bg, borderRadius: 16, borderWidth: 1.5, borderColor: colors.green, padding: spacing(1.75) },
  currentTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  currentTag: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.3, color: colors.green },
  orderNo: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted },
  currentBody: { flexDirection: "row", alignItems: "center", marginTop: spacing(1.5) },
  currentAvatar: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.heading, alignItems: "center", justifyContent: "center" },
  currentAvatarText: { fontFamily: fonts.bold, fontSize: 17, color: colors.white },
  currentInfo: { flex: 1, marginLeft: spacing(1.5) },
  deliveryName: { fontFamily: fonts.bold, fontSize: 15, color: colors.heading },
  deliveryAddr: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  deliveryAmount: { fontFamily: fonts.bold, fontSize: 15, color: colors.heading, marginLeft: spacing(1) },
  actionRow: { flexDirection: "row", alignItems: "center", gap: spacing(1.25), marginTop: spacing(1.75) },
  navigateBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: colors.green },
  navigateText: { fontFamily: fonts.bold, fontSize: 14, color: colors.green },
  callBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.greenTint, alignItems: "center", justifyContent: "center" },
  deliveredBtn: { flex: 1, height: 44, borderRadius: 12, backgroundColor: colors.green, alignItems: "center", justifyContent: "center" },
  deliveredText: { fontFamily: fonts.bold, fontSize: 14, color: colors.white },

  // Upcoming delivery rows
  deliveryRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.bg, borderRadius: 16, borderWidth: 1, borderColor: colors.lineSoft, padding: spacing(1.5), marginTop: spacing(1.25) },
  rowAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgSoft, alignItems: "center", justifyContent: "center" },
  rowAvatarText: { fontFamily: fonts.bold, fontSize: 16, color: colors.heading },
  rowInfo: { flex: 1, marginLeft: spacing(1.5) },
  rowNameLine: { flexDirection: "row", alignItems: "center", gap: spacing(1) },
  payPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  payCod: { backgroundColor: "#fff4d6" },
  payPrepaid: { backgroundColor: colors.greenTint },
  payText: { fontFamily: fontsAlt.extrabold, fontSize: 9, letterSpacing: 0.5 },
  payTextCod: { color: "#b98421" },
  payTextPrepaid: { color: colors.green },

  viewAllBtn: { height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: colors.line, alignItems: "center", justifyContent: "center", marginTop: spacing(2) },
  viewAllText: { fontFamily: fonts.bold, fontSize: 14, color: colors.heading },
});
