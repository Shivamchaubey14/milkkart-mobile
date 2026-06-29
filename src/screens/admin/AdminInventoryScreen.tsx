import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  LowStockItem,
  useAdminAdjustStockMutation,
  useAdminLowStockQuery,
  useAdminMovementsQuery,
  useAdminRestockMutation,
} from "../../api/baseApi";
import { Screen } from "../../components/Screen";
import { ListSkeleton } from "../../components/Skeleton";
import { useToast } from "../../components/Toast";
import { colors, fonts, fontsAlt, spacing } from "../../theme";

const THRESHOLDS = [10, 20, 50];
const REASON_LABEL: Record<string, string> = {
  restock: "Restock",
  sale: "Sale",
  cancellation: "Cancellation",
  subscription: "Subscription",
  adjustment: "Adjustment",
  damage: "Damage",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export default function AdminInventoryScreen() {
  const navigation = useNavigation();
  const [tab, setTab] = useState<"low" | "moves">("low");
  const [threshold, setThreshold] = useState(20);
  const [editing, setEditing] = useState<LowStockItem | null>(null);

  const low = useAdminLowStockQuery(threshold);
  const moves = useAdminMovementsQuery();

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <View style={styles.blob} />
        <View style={styles.headerRow}>
          <Pressable style={styles.back} onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="arrow-back" size={20} color={colors.white} />
          </Pressable>
          <Text style={styles.headerTitle}>Inventory</Text>
        </View>
        <View style={styles.segment}>
          {(["low", "moves"] as const).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={[styles.segBtn, tab === t && styles.segBtnActive]}>
              <Text style={[styles.segText, tab === t && styles.segTextActive]}>
                {t === "low" ? "Low stock" : "Movements"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {tab === "low" ? (
        <>
          <View style={styles.threshRow}>
            <Text style={styles.threshLabel}>At or below</Text>
            {THRESHOLDS.map((th) => (
              <Pressable key={th} onPress={() => setThreshold(th)} style={[styles.threshChip, threshold === th && styles.threshChipActive]}>
                <Text style={[styles.threshChipText, threshold === th && styles.threshChipTextActive]}>{th}</Text>
              </Pressable>
            ))}
          </View>
          {low.isLoading ? (
            <ListSkeleton rows={6} thumb={false} />
          ) : (
            <ScrollView
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={low.isFetching} onRefresh={low.refetch} tintColor={colors.green} colors={[colors.green]} />}
            >
              {(low.data?.variants ?? []).length === 0 ? (
                <View style={styles.empty}>
                  <View style={styles.emptyBadge}><Ionicons name="checkmark-done-outline" size={30} color={colors.green} /></View>
                  <Text style={styles.emptyTitle}>All stocked up</Text>
                  <Text style={styles.emptySub}>Nothing at or below {threshold} units.</Text>
                </View>
              ) : (
                low.data!.variants.map((v) => (
                  <Pressable key={v.variant_id} style={styles.row} onPress={() => setEditing(v)}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowName} numberOfLines={1}>{v.product_name}</Text>
                      <Text style={styles.rowMeta} numberOfLines={1}>{v.label} · {v.sku}</Text>
                    </View>
                    <View style={[styles.stockBadge, v.stock === 0 ? styles.stockOut : v.stock <= 5 ? styles.stockLow : styles.stockOk]}>
                      <Text style={[styles.stockText, v.stock === 0 ? styles.stockTextOut : v.stock <= 5 ? styles.stockTextLow : styles.stockTextOk]}>
                        {v.stock}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                  </Pressable>
                ))
              )}
            </ScrollView>
          )}
        </>
      ) : moves.isLoading ? (
        <ListSkeleton rows={7} thumb={false} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={moves.isFetching} onRefresh={moves.refetch} tintColor={colors.green} colors={[colors.green]} />}
        >
          {(moves.data ?? []).length === 0 ? (
            <Text style={styles.emptySub}>No stock movements yet.</Text>
          ) : (
            moves.data!.map((m) => {
              const up = m.delta >= 0;
              return (
                <View key={m.id} style={styles.moveRow}>
                  <View style={[styles.moveIcon, { backgroundColor: up ? colors.greenTint : colors.errorTint }]}>
                    <Ionicons name={up ? "arrow-up" : "arrow-down"} size={15} color={up ? colors.green : colors.error} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName} numberOfLines={1}>{m.product_name}</Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {REASON_LABEL[m.reason] || m.reason} · {fmtDate(m.created_at)}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[styles.moveDelta, { color: up ? colors.green : colors.error }]}>
                      {up ? "+" : ""}{m.delta}
                    </Text>
                    <Text style={styles.moveBalance}>→ {m.balance_after}</Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {editing ? <StockSheet item={editing} onClose={() => setEditing(null)} /> : null}
    </Screen>
  );
}

// ---- restock / adjust sheet -----------------------------------------------
function StockSheet({ item, onClose }: { item: LowStockItem; onClose: () => void }) {
  const toast = useToast();
  const [restock, { isLoading: restocking }] = useAdminRestockMutation();
  const [adjust, { isLoading: adjusting }] = useAdminAdjustStockMutation();
  const [mode, setMode] = useState<"restock" | "adjust">("restock");
  const [qty, setQty] = useState("");
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState<"adjustment" | "damage">("adjustment");
  const [note, setNote] = useState("");
  const saving = restocking || adjusting;

  async function save() {
    try {
      if (mode === "restock") {
        const n = parseInt(qty, 10);
        if (!n || n <= 0) return toast("Enter how many units to add.", "info");
        await restock({ variant_id: item.variant_id, quantity: n, note: note.trim() }).unwrap();
        toast(`Added ${n} — restocked.`);
      } else {
        const d = parseInt(delta, 10);
        if (!d) return toast("Enter a non-zero change (e.g. -3).", "info");
        await adjust({ variant_id: item.variant_id, delta: d, reason, note: note.trim() }).unwrap();
        toast("Stock adjusted.");
      }
      onClose();
    } catch (e: any) {
      toast(e?.data?.error || "Couldn't update the stock.", "error");
    }
  }

  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={sheet.backdrop} onPress={onClose} />
      <View style={sheet.sheet}>
        <View style={sheet.handle} />
        <Text style={sheet.title} numberOfLines={1}>{item.product_name}</Text>
        <Text style={sheet.sub}>{item.label} · in stock: {item.stock}</Text>

        <View style={sheet.modeRow}>
          {(["restock", "adjust"] as const).map((m) => (
            <Pressable key={m} onPress={() => setMode(m)} style={[sheet.modeBtn, mode === m && sheet.modeBtnActive]}>
              <Text style={[sheet.modeText, mode === m && sheet.modeTextActive]}>{m === "restock" ? "Add stock" : "Adjust"}</Text>
            </Pressable>
          ))}
        </View>

        {mode === "restock" ? (
          <>
            <Text style={sheet.label}>Units to add</Text>
            <TextInput style={sheet.input} value={qty} onChangeText={setQty} keyboardType="number-pad" placeholder="e.g. 50" placeholderTextColor={colors.muted} />
          </>
        ) : (
          <>
            <Text style={sheet.label}>Change (use − to remove)</Text>
            <TextInput style={sheet.input} value={delta} onChangeText={setDelta} keyboardType="numbers-and-punctuation" placeholder="e.g. -3" placeholderTextColor={colors.muted} />
            <Text style={sheet.label}>Reason</Text>
            <View style={sheet.reasonRow}>
              {(["adjustment", "damage"] as const).map((r) => (
                <Pressable key={r} onPress={() => setReason(r)} style={[sheet.reasonChip, reason === r && sheet.reasonChipActive]}>
                  <Text style={[sheet.reasonText, reason === r && sheet.reasonTextActive]}>{r === "adjustment" ? "Manual adjustment" : "Damage / wastage"}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <Text style={sheet.label}>Note (optional)</Text>
        <TextInput style={sheet.input} value={note} onChangeText={setNote} placeholder="Reason / reference" placeholderTextColor={colors.muted} />

        <View style={sheet.actions}>
          <Pressable style={[sheet.btn, sheet.btnGhost]} onPress={onClose}><Text style={sheet.btnGhostText}>Cancel</Text></Pressable>
          <Pressable style={[sheet.btn, sheet.btnPrimary, saving && { opacity: 0.7 }]} onPress={save} disabled={saving}>
            <Text style={sheet.btnPrimaryText}>{saving ? "Saving…" : "Save"}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.heading, borderRadius: 26, marginHorizontal: spacing(2.5), marginTop: spacing(1),
    paddingHorizontal: spacing(2.5), paddingTop: spacing(2.5), paddingBottom: spacing(2), overflow: "hidden",
  },
  blob: { position: "absolute", top: -45, right: -30, width: 150, height: 150, borderRadius: 75, backgroundColor: "rgba(255,255,255,0.06)" },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing(1.5) },
  back: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: fonts.bold, fontSize: 22, color: colors.white },
  segment: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 12, padding: 4, marginTop: spacing(2) },
  segBtn: { flex: 1, paddingVertical: spacing(1), borderRadius: 9, alignItems: "center" },
  segBtnActive: { backgroundColor: colors.white },
  segText: { fontFamily: fonts.bold, fontSize: 14, color: "rgba(255,255,255,0.8)" },
  segTextActive: { color: colors.heading },

  threshRow: { flexDirection: "row", alignItems: "center", gap: spacing(1), paddingHorizontal: spacing(2.5), paddingTop: spacing(2) },
  threshLabel: { fontFamily: fontsAlt.regular, fontSize: 13, color: colors.muted, marginRight: spacing(0.5) },
  threshChip: { paddingVertical: spacing(0.75), paddingHorizontal: spacing(1.75), borderRadius: 999, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.bg },
  threshChipActive: { backgroundColor: colors.green, borderColor: colors.green },
  threshChipText: { fontFamily: fonts.bold, fontSize: 13, color: colors.heading },
  threshChipTextActive: { color: colors.white },

  list: { paddingHorizontal: spacing(2.5), paddingTop: spacing(2), paddingBottom: spacing(4) },
  row: { flexDirection: "row", alignItems: "center", gap: spacing(1.25), backgroundColor: colors.bg, borderRadius: 14, borderWidth: 1, borderColor: colors.lineSoft, padding: spacing(1.5), marginBottom: spacing(1.25) },
  rowName: { fontFamily: fonts.bold, fontSize: 14, color: colors.heading },
  rowMeta: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  stockBadge: { minWidth: 38, alignItems: "center", borderRadius: 9, paddingVertical: 4, paddingHorizontal: 8 },
  stockOk: { backgroundColor: colors.greenTint },
  stockLow: { backgroundColor: "#fff4d6" },
  stockOut: { backgroundColor: colors.errorTint },
  stockText: { fontFamily: fonts.bold, fontSize: 14 },
  stockTextOk: { color: colors.green },
  stockTextLow: { color: "#b98421" },
  stockTextOut: { color: colors.error },

  moveRow: { flexDirection: "row", alignItems: "center", gap: spacing(1.25), backgroundColor: colors.bg, borderRadius: 14, borderWidth: 1, borderColor: colors.lineSoft, padding: spacing(1.5), marginBottom: spacing(1) },
  moveIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  moveDelta: { fontFamily: fonts.bold, fontSize: 15 },
  moveBalance: { fontFamily: fontsAlt.regular, fontSize: 11, color: colors.muted, marginTop: 1 },

  empty: { alignItems: "center", paddingTop: spacing(6) },
  emptyBadge: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.greenTint, alignItems: "center", justifyContent: "center", marginBottom: spacing(2) },
  emptyTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.heading },
  emptySub: { fontFamily: fontsAlt.regular, fontSize: 13, color: colors.muted, marginTop: 4, paddingHorizontal: spacing(2.5) },
});

const sheet = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: spacing(2.5), paddingTop: spacing(1.25), paddingBottom: spacing(3) },
  handle: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: spacing(1.5) },
  title: { fontFamily: fonts.bold, fontSize: 18, color: colors.heading },
  sub: { fontFamily: fontsAlt.regular, fontSize: 13, color: colors.muted, marginTop: 2 },

  modeRow: { flexDirection: "row", backgroundColor: colors.bgSoft, borderRadius: 12, padding: 4, marginTop: spacing(2) },
  modeBtn: { flex: 1, paddingVertical: spacing(1), borderRadius: 9, alignItems: "center" },
  modeBtnActive: { backgroundColor: colors.green },
  modeText: { fontFamily: fonts.bold, fontSize: 14, color: colors.heading },
  modeTextActive: { color: colors.white },

  label: { fontFamily: fontsAlt.extrabold, fontSize: 11, letterSpacing: 0.8, color: colors.muted, marginTop: spacing(1.75), marginBottom: spacing(0.75) },
  input: { backgroundColor: colors.bgSoft, borderRadius: 12, borderWidth: 1, borderColor: colors.line, paddingHorizontal: spacing(1.75), paddingVertical: spacing(1.5), fontFamily: fonts.medium, fontSize: 15, color: colors.heading },
  reasonRow: { flexDirection: "row", gap: spacing(1) },
  reasonChip: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: colors.line, paddingVertical: spacing(1.25), paddingHorizontal: spacing(1), alignItems: "center", backgroundColor: colors.bg },
  reasonChipActive: { borderColor: colors.green, backgroundColor: colors.greenTint },
  reasonText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.heading, textAlign: "center" },
  reasonTextActive: { color: colors.green },

  actions: { flexDirection: "row", gap: spacing(1.25), marginTop: spacing(2.5) },
  btn: { flex: 1, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  btnPrimary: { backgroundColor: colors.green },
  btnPrimaryText: { fontFamily: fonts.bold, fontSize: 15, color: colors.white },
  btnGhost: { backgroundColor: colors.bgSoft },
  btnGhostText: { fontFamily: fonts.bold, fontSize: 15, color: colors.heading },
});
