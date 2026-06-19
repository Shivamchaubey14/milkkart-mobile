import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import {
  WalletTransaction,
  useWalletMockPayMutation,
  useWalletQuery,
  useWalletTopupMutation,
} from "../api/baseApi";
import { Screen } from "../components/Screen";
import { useToast } from "../components/Toast";
import { colors, fonts, fontsAlt, spacing } from "../theme";

const money = (n: number | string) => "₹" + Number(n).toFixed(2);
const QUICK = [100, 200, 500];

function fmtDate(iso: string) {
  const d = new Date(iso);
  const day = d.getDate();
  const mon = d.toLocaleDateString(undefined, { month: "short" });
  const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${day} ${mon}, ${time}`;
}

export default function WalletScreen() {
  const toast = useToast();
  const { data: wallet, isLoading } = useWalletQuery();
  const [topup, { isLoading: t1 }] = useWalletTopupMutation();
  const [mockPay, { isLoading: t2 }] = useWalletMockPayMutation();
  const [amount, setAmount] = useState("");
  const adding = t1 || t2;

  async function addMoney() {
    const amt = parseFloat(amount);
    if (!amt || amt < 1) {
      toast("Enter an amount to add.", "info");
      return;
    }
    try {
      const res = await topup(amt).unwrap();
      await mockPay(res.gateway.order_id).unwrap();
      toast(`${money(amt)} added to your wallet.`);
      setAmount("");
    } catch (e: any) {
      toast(e?.data?.error || "Online top-up needs the payment gateway (coming soon).", "error");
    }
  }

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.blob} />
            <Text style={styles.headerTitle}>MilkKart Wallet</Text>
          </View>

          <View style={styles.body}>
            {/* Balance card */}
            <LinearGradient colors={[colors.green, colors.greenDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balanceCard}>
              <View style={styles.balanceBlob} />
              <View style={styles.balanceTop}>
                <Text style={styles.balanceLabel}>Available Balance</Text>
                <Text style={styles.brand}>MilkKart</Text>
              </View>
              <Text style={styles.balanceValue}>{isLoading ? "—" : money(wallet?.balance ?? 0)}</Text>
            </LinearGradient>

            {/* Add money */}
            <Text style={styles.sectionTitle}>Add Money</Text>
            <View style={styles.quickRow}>
              {QUICK.map((q) => {
                const active = amount === String(q);
                return (
                  <Pressable
                    key={q}
                    onPress={() => setAmount(String(q))}
                    style={[styles.quickChip, active && styles.quickChipActive]}
                  >
                    <Text style={[styles.quickText, active && styles.quickTextActive]}>+₹{q}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.addRow}>
              <View style={styles.amountWrap}>
                <Text style={styles.rupee}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={(v) => setAmount(v.replace(/[^0-9]/g, ""))}
                  placeholder="Enter amount"
                  placeholderTextColor={colors.muted}
                  keyboardType="number-pad"
                />
              </View>
              <Pressable style={styles.addBtn} onPress={addMoney} disabled={adding}>
                {adding ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.addText}>Add</Text>}
              </Pressable>
            </View>

            {/* Transactions */}
            <Text style={styles.sectionTitle}>Transaction History</Text>
            {isLoading ? (
              <ActivityIndicator color={colors.green} style={{ marginTop: spacing(2) }} />
            ) : wallet && wallet.recent_transactions.length > 0 ? (
              wallet.recent_transactions.map((tx) => <TxnRow key={tx.id} tx={tx} />)
            ) : (
              <Text style={styles.empty}>No transactions yet.</Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function TxnRow({ tx }: { tx: WalletTransaction }) {
  const n = Number(tx.signed_amount);
  const credit = n >= 0;
  const sub = [tx.order_number ? `#${tx.order_number.slice(0, 8)}` : null, fmtDate(tx.created_at)]
    .filter(Boolean)
    .join(" · ");
  return (
    <View style={styles.txn}>
      <View style={[styles.txnIcon, { backgroundColor: credit ? colors.greenTint : colors.errorTint }]}>
        <Ionicons name={credit ? "arrow-up" : "arrow-down"} size={18} color={credit ? colors.green : colors.error} />
      </View>
      <View style={styles.txnInfo}>
        <Text style={styles.txnTitle} numberOfLines={1}>
          {tx.description}
        </Text>
        <Text style={styles.txnSub} numberOfLines={1}>
          {sub}
        </Text>
      </View>
      <Text style={[styles.txnAmount, { color: credit ? colors.green : colors.error }]}>
        {credit ? "+" : "−"}
        {money(Math.abs(n))}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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

  body: { paddingHorizontal: spacing(2.5), paddingTop: spacing(2) },

  // Balance card
  balanceCard: { borderRadius: 20, padding: spacing(2.5), overflow: "hidden" },
  balanceBlob: {
    position: "absolute",
    bottom: -50,
    right: -20,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  balanceTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  balanceLabel: { fontFamily: fontsAlt.regular, fontSize: 13, color: "rgba(255,255,255,0.9)" },
  brand: { fontFamily: fonts.bold, fontSize: 13, color: "rgba(255,255,255,0.85)" },
  balanceValue: { fontFamily: fonts.bold, fontSize: 34, color: colors.white, marginTop: spacing(1) },

  sectionTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.heading, marginTop: spacing(3), marginBottom: spacing(1.5) },

  // Add money
  quickRow: { flexDirection: "row", gap: spacing(1.25) },
  quickChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing(1.5),
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.bg,
  },
  quickChipActive: { borderColor: colors.green, backgroundColor: colors.greenTint },
  quickText: { fontFamily: fonts.bold, fontSize: 14, color: colors.heading },
  quickTextActive: { color: colors.green },
  addRow: { flexDirection: "row", gap: spacing(1.25), marginTop: spacing(1.25) },
  amountWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: spacing(1.5),
    height: 50,
  },
  rupee: { fontFamily: fonts.semibold, fontSize: 16, color: colors.muted, marginRight: 4 },
  amountInput: { flex: 1, fontFamily: fonts.semibold, fontSize: 16, color: colors.heading, paddingVertical: 0 },
  addBtn: {
    backgroundColor: colors.green,
    borderRadius: 12,
    paddingHorizontal: spacing(3),
    alignItems: "center",
    justifyContent: "center",
    minWidth: 84,
  },
  addText: { fontFamily: fonts.bold, fontSize: 15, color: colors.white },

  // Transactions
  empty: { fontFamily: fontsAlt.regular, fontSize: 14, color: colors.muted, marginTop: spacing(1) },
  txn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    padding: spacing(1.5),
    marginBottom: spacing(1.25),
  },
  txnIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  txnInfo: { flex: 1, marginLeft: spacing(1.5) },
  txnTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.heading },
  txnSub: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  txnAmount: { fontFamily: fonts.bold, fontSize: 15 },
});
