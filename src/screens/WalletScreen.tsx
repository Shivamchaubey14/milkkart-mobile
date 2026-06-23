import { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Animated,
  AppState,
  KeyboardAvoidingView,
  Linking,
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
import * as IntentLauncher from "expo-intent-launcher";

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

// Merchant UPI details — the payee that collects the top-up. Set these to your
// own registered VPA / business name to actually receive funds in production.
const UPI_VPA = "milkkart@upi";
const UPI_PAYEE_NAME = "MilkKart";

type UpiApp = { key: string; name: string; pkg?: string };
// `pkg` is the Android package we target the UPI intent at; "Other" omits it so
// the system shows its UPI app chooser.
const UPI_APPS: UpiApp[] = [
  { key: "gpay", name: "Google Pay", pkg: "com.google.android.apps.nbu.paisa.user" },
  { key: "phonepe", name: "PhonePe", pkg: "com.phonepe.app" },
  { key: "paytm", name: "Paytm", pkg: "net.one97.paytm" },
  { key: "other", name: "Other UPI App" },
];

// Build the UPI intent URL (NPCI spec params: pa=payee VPA, pn=name, am=amount,
// cu=currency, tn=note, tr=merchant txn ref). `tr` is the gateway order id so we
// can reconcile the payment on return.
function buildUpiUrl(amount: number, ref: string) {
  const params = [
    `pa=${encodeURIComponent(UPI_VPA)}`,
    `pn=${encodeURIComponent(UPI_PAYEE_NAME)}`,
    `am=${amount}`,
    `cu=INR`,
    `tn=${encodeURIComponent("MilkKart wallet top-up")}`,
    `tr=${encodeURIComponent(ref)}`,
  ].join("&");
  return `upi://pay?${params}`;
}

// UPI PSP apps return their result as intent extras (key "Status" or a "response"
// blob like "txnId=...&Status=SUCCESS&..."). Normalise that to one word.
function parseUpiStatus(result: IntentLauncher.IntentLauncherResult): string {
  const extra = (result.extra ?? {}) as Record<string, unknown>;
  const statusKey = Object.keys(extra).find((k) => k.toLowerCase() === "status");
  let status = statusKey ? String(extra[statusKey]) : "";
  if (!status) {
    const respKey = Object.keys(extra).find((k) => k.toLowerCase() === "response");
    const resp = respKey ? String(extra[respKey]) : String((result as { data?: string }).data ?? "");
    const m = /status=([a-zA-Z]+)/.exec(resp);
    if (m) status = m[1];
  }
  return status.toLowerCase();
}

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
  const { data: wallet, isLoading, refetch } = useWalletQuery();
  const [topup] = useWalletTopupMutation();
  const [mockPay] = useWalletMockPayMutation();
  const [amount, setAmount] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  // Which UPI app is currently being launched — so only that card spins.
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const txns = wallet?.recent_transactions ?? [];

  // iOS fallback only: Linking can't report a UPI result, so a return to the
  // foreground is treated as the user backing out (Android reads the real result).
  const awaitingReturn = useRef(false);
  const onReturn = useRef<() => void>(() => {});
  onReturn.current = () => {
    if (!awaitingReturn.current) return;
    awaitingReturn.current = false;
    refetch();
    toast("You canceled your top-up.", "info");
  };
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") onReturn.current();
    });
    return () => sub.remove();
  }, []);

  function openSheet() {
    const amt = parseFloat(amount);
    if (!amt || amt < 1) {
      toast("Enter an amount to add.", "info");
      return;
    }
    setSheetOpen(true);
  }

  // Complete the gateway payment and credit the wallet (mock gateway in dev).
  async function creditWallet(orderId: string, amt: number) {
    try {
      await mockPay(orderId).unwrap();
      toast(`${money(amt)} added to your wallet.`);
      setAmount("");
    } catch (e: any) {
      refetch();
      toast(e?.data?.error || "Payment received — confirming your balance…", "info");
    }
  }

  // Android: launch the UPI app via an intent and read the result it returns.
  async function payAndroid(app: UpiApp, url: string, orderId: string, amt: number) {
    let result: IntentLauncher.IntentLauncherResult;
    try {
      result = await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
        data: url,
        ...(app.pkg ? { packageName: app.pkg } : {}),
      });
    } catch {
      // Targeted app not installed — retry without a package so the OS chooser shows.
      try {
        result = await IntentLauncher.startActivityAsync("android.intent.action.VIEW", { data: url });
      } catch {
        toast(`${app.name} isn't installed. Try another UPI app.`, "error");
        return;
      }
    }
    const status = parseUpiStatus(result);
    if (status === "success") {
      await creditWallet(orderId, amt);
    } else if (status === "submitted" || status === "pending") {
      refetch();
      toast("Payment submitted — your balance will update once it's confirmed.", "info");
    } else if (status === "failure" || status === "failed") {
      toast("Your payment failed. No money was deducted.", "error");
    } else {
      toast("You canceled your top-up.", "info");
    }
  }

  // Create the top-up order, then hand off to the chosen UPI app.
  async function launchUpi(app: UpiApp) {
    const amt = parseFloat(amount);
    if (!amt || amt < 1) return;
    setLoadingKey(app.key);
    try {
      const res = await topup(amt).unwrap();
      const orderId = res.gateway.order_id;
      const url = buildUpiUrl(amt, orderId);
      setSheetOpen(false);
      if (Platform.OS === "android") {
        await payAndroid(app, url, orderId, amt);
      } else {
        // iOS: open the link and fall back to cancel-on-return detection.
        try {
          await Linking.openURL(url);
          awaitingReturn.current = true;
        } catch {
          toast("No UPI app found to handle the payment.", "error");
        }
      }
    } catch (e: any) {
      toast(e?.data?.error || "The top-up couldn't start. Please try again.", "error");
    } finally {
      setLoadingKey(null);
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

          <Text style={[styles.sectionTitle, styles.historyTitle]}>Transaction History</Text>
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
        loadingKey={loadingKey}
        onClose={() => setSheetOpen(false)}
        onPick={launchUpi}
      />
    </Screen>
  );
}

function AddMoneySheet({
  visible,
  amount,
  loadingKey,
  onClose,
  onPick,
}: {
  visible: boolean;
  amount: string;
  loadingKey: string | null;
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

        {UPI_APPS.map((app) => {
          const busy = loadingKey === app.key;
          return (
            <Pressable
              key={app.key}
              style={[styles.upiRow, busy && styles.upiRowBusy]}
              onPress={() => onPick(app)}
              disabled={!!loadingKey}
            >
              <View style={styles.upiBadge}>
                <UpiLogo k={app.key} />
              </View>
              <Text style={styles.upiName}>{app.name}</Text>
              {busy ? (
                <ActivityIndicator size="small" color={colors.green} />
              ) : (
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              )}
            </Pressable>
          );
        })}
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

  // Balance card — pulled up to overlap the header (a touch lower & smaller now).
  balanceCard: {
    borderRadius: 20,
    padding: spacing(2.25),
    overflow: "hidden",
    marginTop: -spacing(4.5),
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
  balanceValue: { fontFamily: fonts.bold, fontSize: 30, color: colors.white, marginTop: spacing(0.75) },

  sectionTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.heading, marginTop: spacing(2.5), marginBottom: spacing(1.5) },
  // Extra gap so the "Transaction History" heading clears the Add-money row above.
  historyTitle: { marginTop: spacing(3.25) },

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
  upiRowBusy: { borderColor: colors.green, backgroundColor: colors.greenTint },
  upiName: { flex: 1, fontFamily: fonts.bold, fontSize: 15, color: colors.heading },
});
