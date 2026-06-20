import { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import {
  WalletTransaction,
  useWalletMockPayMutation,
  useWalletQuery,
  useWalletTopupMutation,
} from "../api/baseApi";
import { GooglePayLogo, PaytmLogo, PhonePeLogo } from "../components/PaymentLogos";
import { Screen } from "../components/Screen";
import { useToast } from "../components/Toast";
import { colors, fonts, fontsAlt, spacing } from "../theme";

const money = (n: number | string) => "₹" + Number(n).toFixed(2);
const QUICK = [100, 200, 500];

type UpiApp = { key: string; name: string };
const UPI_APPS: UpiApp[] = [
  { key: "gpay", name: "Google Pay" },
  { key: "phonepe", name: "PhonePe" },
  { key: "paytm", name: "Paytm" },
  { key: "other", name: "Other UPI App" },
];

function UpiLogo({ k }: { k: string }) {
  if (k === "gpay") return <GooglePayLogo size={40} />;
  if (k === "phonepe") return <PhonePeLogo size={40} />;
  if (k === "paytm") return <PaytmLogo size={40} />;
  return (
    <View style={styles.otherBadge}>
      <Ionicons name="apps-outline" size={18} color={colors.heading} />
    </View>
  );
}

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
  const [sheetOpen, setSheetOpen] = useState(false);
  const adding = t1 || t2;
  const txns = wallet?.recent_transactions ?? [];

  function openSheet() {
    const amt = parseFloat(amount);
    if (!amt || amt < 1) {
      toast("Enter an amount to add.", "info");
      return;
    }
    setSheetOpen(true);
  }

  async function pay() {
    const amt = parseFloat(amount);
    try {
      const res = await topup(amt).unwrap();
      await mockPay(res.gateway.order_id).unwrap();
      toast(`${money(amt)} added to your wallet.`);
      setAmount("");
      setSheetOpen(false);
    } catch (e: any) {
      toast(e?.data?.error || "Online top-up needs the payment gateway (coming soon).", "error");
    }
  }

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        {/* Tall dark header — the balance card overlaps onto it. */}
        <View style={styles.header}>
          <View style={styles.blob} />
          <Text style={styles.headerTitle}>MilkKart Wallet</Text>
        </View>

        {/* Fixed top: balance + add money + section heading. */}
        <View style={styles.topBody}>
          <LinearGradient
            colors={[colors.green, colors.greenDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.balanceCard}
          >
            <View style={styles.balanceBlob} />
            <View style={styles.balanceTop}>
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <Text style={styles.brand}>MilkKart</Text>
            </View>
            <Text style={styles.balanceValue}>{isLoading ? "—" : money(wallet?.balance ?? 0)}</Text>
          </LinearGradient>

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
            <Pressable style={styles.addBtn} onPress={openSheet}>
              <Text style={styles.addText}>Add</Text>
            </Pressable>
          </View>

          <Text style={styles.sectionTitle}>Transaction History</Text>
        </View>

        {/* Only the transaction list scrolls. */}
        <ScrollView style={styles.flex} showsVerticalScrollIndicator={false} contentContainerStyle={styles.txnList}>
          {isLoading ? (
            <ActivityIndicator color={colors.green} style={{ marginTop: spacing(2) }} />
          ) : txns.length > 0 ? (
            txns.map((tx) => <TxnRow key={tx.id} tx={tx} />)
          ) : (
            <Text style={styles.empty}>No transactions yet.</Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <AddMoneySheet
        visible={sheetOpen}
        amount={amount}
        loading={adding}
        onClose={() => setSheetOpen(false)}
        onPick={pay}
      />
    </Screen>
  );
}

function AddMoneySheet({
  visible,
  amount,
  loading,
  onClose,
  onPick,
}: {
  visible: boolean;
  amount: string;
  loading: boolean;
  onClose: () => void;
  onPick: (app: UpiApp) => void;
}) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(700)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(backdrop, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 160 }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(backdrop, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 700, duration: 220, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!mounted) return null;

  return (
    <Modal transparent visible={mounted} onRequestClose={onClose} animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View
        style={[styles.sheet, { transform: [{ translateY }], paddingBottom: insets.bottom + spacing(2) }]}
      >
        <View style={styles.handle} />
        <View style={styles.sheetHead}>
          <Text style={styles.sheetTitle}>Add {money(amount || 0)}</Text>
          <Pressable style={styles.sheetClose} onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={18} color={colors.heading} />
          </Pressable>
        </View>
        <Text style={styles.sheetSub}>Choose a UPI app to pay</Text>

        {UPI_APPS.map((app) => (
          <Pressable key={app.key} style={styles.upiRow} onPress={() => onPick(app)} disabled={loading}>
            <View style={styles.upiBadge}>
              <UpiLogo k={app.key} />
            </View>
            <Text style={styles.upiName}>{app.name}</Text>
            {loading ? (
              <ActivityIndicator size="small" color={colors.green} />
            ) : (
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            )}
          </Pressable>
        ))}
      </Animated.View>
    </Modal>
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

  // Tall header; balance card overlaps its lower half.
  header: {
    backgroundColor: colors.heading,
    borderRadius: 26,
    marginHorizontal: spacing(2.5),
    marginTop: spacing(1),
    paddingHorizontal: spacing(2.5),
    paddingTop: spacing(2.5),
    paddingBottom: spacing(7),
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

  topBody: { paddingHorizontal: spacing(2.5) },

  // Balance card — pulled up to overlap the header.
  balanceCard: {
    borderRadius: 20,
    padding: spacing(2.5),
    overflow: "hidden",
    marginTop: -spacing(6),
    zIndex: 1,
  },
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

  sectionTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.heading, marginTop: spacing(2.5), marginBottom: spacing(1.5) },

  // Add money — Nunito Sans input.
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
  rupee: { fontFamily: fontsAlt.bold, fontSize: 16, color: colors.muted, marginRight: 4 },
  amountInput: { flex: 1, fontFamily: fontsAlt.semibold, fontSize: 16, color: colors.heading, paddingVertical: 0 },
  addBtn: {
    backgroundColor: colors.green,
    borderRadius: 12,
    paddingHorizontal: spacing(3),
    alignItems: "center",
    justifyContent: "center",
    minWidth: 84,
  },
  addText: { fontFamily: fonts.bold, fontSize: 15, color: colors.white },

  // Transactions — Nunito Sans content.
  txnList: { paddingHorizontal: spacing(2.5), paddingTop: spacing(0.5), paddingBottom: spacing(3) },
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
  txnTitle: { fontFamily: fontsAlt.bold, fontSize: 14, color: colors.heading },
  txnSub: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  txnAmount: { fontFamily: fontsAlt.bold, fontSize: 15 },

  // Add-money bottom sheet
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(37,61,78,0.45)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: spacing(2.5),
    paddingTop: spacing(1.25),
  },
  handle: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: spacing(2) },
  sheetHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sheetTitle: { fontFamily: fonts.bold, fontSize: 20, color: colors.heading },
  sheetClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bgSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetSub: { fontFamily: fontsAlt.regular, fontSize: 13, color: colors.green, marginTop: 4, marginBottom: spacing(2) },
  upiRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    padding: spacing(1.5),
    marginBottom: spacing(1.25),
  },
  upiBadge: { width: 40, height: 40, alignItems: "center", justifyContent: "center", marginRight: spacing(1.5) },
  otherBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.lineSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  upiName: { flex: 1, fontFamily: fonts.bold, fontSize: 15, color: colors.heading },
});
