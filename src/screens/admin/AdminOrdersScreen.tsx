import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  AdminOrder,
  useAdminAssignOrderMutation,
  useAdminCancelOrderMutation,
  useAdminConfirmOrderMutation,
  useAdminOrdersQuery,
} from "../../api/baseApi";
import { Screen } from "../../components/Screen";
import { ListSkeleton } from "../../components/Skeleton";
import { useToast } from "../../components/Toast";
import { colors, fonts, fontsAlt, spacing } from "../../theme";

const money = (n: number | string) => "₹" + Number(n).toFixed(2);

const FILTERS: [string, string][] = [
  ["", "All"],
  ["pending", "Pending"],
  ["confirmed", "Confirmed"],
  ["out_for_delivery", "Out"],
  ["delivered", "Delivered"],
  ["cancelled", "Cancelled"],
];

const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  pending: { label: "PENDING", bg: "#fff4d6", fg: "#b98421" },
  confirmed: { label: "CONFIRMED", bg: colors.greenTint, fg: colors.green },
  out_for_delivery: { label: "OUT FOR DELIVERY", bg: "#e8f2fc", fg: colors.info },
  delivered: { label: "DELIVERED", bg: "#e8f2fc", fg: colors.info },
  cancelled: { label: "CANCELLED", bg: colors.errorTint, fg: colors.error },
  returned: { label: "RETURNED", bg: "#fdecd9", fg: "#b46b00" },
};
const statusOf = (s: string) => STATUS[s] ?? { label: s.toUpperCase(), bg: colors.lineSoft, fg: colors.heading };

export default function AdminOrdersScreen() {
  const navigation = useNavigation();
  const toast = useToast();
  const [filter, setFilter] = useState("");
  const { data: orders, isLoading, isFetching, refetch } = useAdminOrdersQuery(
    filter ? { status: filter } : undefined,
    { refetchOnMountOrArgChange: true },
  );
  const [confirmOrder] = useAdminConfirmOrderMutation();
  const [cancelOrder] = useAdminCancelOrderMutation();
  const [assignOrder] = useAdminAssignOrderMutation();

  async function run(p: Promise<unknown>, ok: string) {
    try {
      await p;
      toast(ok);
    } catch (e: any) {
      toast(e?.data?.error || "Action failed. Please try again.", "error");
    }
  }

  const onConfirm = (o: AdminOrder) => run(confirmOrder(o.order_number).unwrap(), "Order confirmed");
  const onAssign = (o: AdminOrder) => run(assignOrder({ orderNumber: o.order_number }).unwrap(), "Rider assigned");
  const onCancel = (o: AdminOrder) =>
    Alert.alert("Cancel order", `Cancel #${o.order_number.slice(0, 8)}? Any payment is refunded.`, [
      { text: "Keep", style: "cancel" },
      { text: "Cancel order", style: "destructive", onPress: () => run(cancelOrder(o.order_number).unwrap(), "Cancelled & refunded") },
    ]);

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <View style={styles.blob} />
        <View style={styles.headerRow}>
          <Pressable style={styles.back} onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="arrow-back" size={20} color={colors.white} />
          </Pressable>
          <Text style={styles.headerTitle}>Orders</Text>
        </View>
      </View>

      <View style={styles.chipsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {FILTERS.map(([val, label]) => {
            const active = filter === val;
            return (
              <Pressable key={val || "all"} onPress={() => setFilter(val)} style={[styles.chip, active && styles.chipActive]}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.green} colors={[colors.green]} />
          }
        >
          {!orders || orders.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyBadge}>
                <Ionicons name="receipt-outline" size={30} color={colors.green} />
              </View>
              <Text style={styles.emptyTitle}>No orders</Text>
              <Text style={styles.emptySub}>{filter ? "Try a different filter." : "Orders will appear here."}</Text>
            </View>
          ) : (
            orders.map((o) => {
              const s = statusOf(o.status);
              return (
                <View key={o.order_number} style={styles.card}>
                  <View style={styles.cardTop}>
                    <Text style={styles.orderNo}>#{o.order_number.slice(0, 8)}</Text>
                    <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
                      <Text style={[styles.statusText, { color: s.fg }]}>{s.label}</Text>
                    </View>
                  </View>

                  <Text style={styles.customer} numberOfLines={1}>
                    {(o.customer_name?.trim() || "Customer")} · {o.customer_phone}
                  </Text>
                  {o.address_snapshot ? (
                    <Text style={styles.addr} numberOfLines={2}>{o.address_snapshot}</Text>
                  ) : null}

                  <View style={styles.metaRow}>
                    <Text style={styles.meta}>
                      {o.item_count} {o.item_count === 1 ? "item" : "items"}
                    </Text>
                    <Text style={styles.total}>{money(o.total)}</Text>
                  </View>

                  {o.rider ? (
                    <View style={styles.riderRow}>
                      <Ionicons name="bicycle-outline" size={14} color={colors.muted} />
                      <Text style={styles.riderText}>
                        {o.rider.phone} · {o.rider.status.replace(/_/g, " ")}
                      </Text>
                    </View>
                  ) : null}

                  {o.status === "pending" || (o.status === "confirmed" && !o.rider) ? (
                    <View style={styles.actions}>
                      {o.status === "pending" ? (
                        <Pressable style={[styles.btn, styles.btnPrimary]} onPress={() => onConfirm(o)}>
                          <Text style={styles.btnPrimaryText}>Confirm</Text>
                        </Pressable>
                      ) : (
                        <Pressable style={[styles.btn, styles.btnPrimary]} onPress={() => onAssign(o)}>
                          <Text style={styles.btnPrimaryText}>Auto-assign rider</Text>
                        </Pressable>
                      )}
                      <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => onCancel(o)}>
                        <Text style={styles.btnGhostText}>Cancel</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  blob: { position: "absolute", top: -45, right: -30, width: 150, height: 150, borderRadius: 75, backgroundColor: "rgba(255,255,255,0.06)" },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing(1.5) },
  back: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: fonts.bold, fontSize: 22, color: colors.white },

  chipsWrap: { paddingTop: spacing(2) },
  chips: { gap: spacing(1), paddingHorizontal: spacing(2.5) },
  chip: { paddingVertical: spacing(0.75), paddingHorizontal: spacing(2), borderRadius: 999, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.bg },
  chipActive: { backgroundColor: colors.green, borderColor: colors.green },
  chipText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.heading },
  chipTextActive: { color: colors.white },

  list: { paddingHorizontal: spacing(2.5), paddingTop: spacing(2), paddingBottom: spacing(4) },
  card: { backgroundColor: colors.bg, borderRadius: 16, borderWidth: 1, borderColor: colors.lineSoft, padding: spacing(1.75), marginBottom: spacing(1.5) },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  orderNo: { fontFamily: fonts.bold, fontSize: 15, color: colors.heading },
  statusPill: { borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8 },
  statusText: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 0.4 },
  customer: { fontFamily: fonts.semibold, fontSize: 13, color: colors.heading, marginTop: spacing(1) },
  addr: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginTop: 3, lineHeight: 17 },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing(1.25) },
  meta: { fontFamily: fontsAlt.regular, fontSize: 13, color: colors.muted },
  total: { fontFamily: fonts.bold, fontSize: 15, color: colors.green },
  riderRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing(1) },
  riderText: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.text },
  actions: { flexDirection: "row", gap: spacing(1.25), marginTop: spacing(1.75) },
  btn: { flex: 1, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  btnPrimary: { backgroundColor: colors.green },
  btnPrimaryText: { fontFamily: fonts.bold, fontSize: 14, color: colors.white },
  btnGhost: { backgroundColor: colors.errorTint },
  btnGhostText: { fontFamily: fonts.bold, fontSize: 14, color: colors.error },

  empty: { alignItems: "center", paddingTop: spacing(6) },
  emptyBadge: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.greenTint, alignItems: "center", justifyContent: "center", marginBottom: spacing(2) },
  emptyTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.heading },
  emptySub: { fontFamily: fontsAlt.regular, fontSize: 13, color: colors.muted, marginTop: 4 },
});
