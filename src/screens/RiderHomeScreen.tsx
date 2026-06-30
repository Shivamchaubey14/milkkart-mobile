import { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Image, Linking, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  RiderDelivery,
  useAcceptOrderMutation,
  useMeQuery,
  usePickupOrderMutation,
  useRiderDayQuery,
  useRiderDutyQuery,
  useSetRiderDutyMutation,
} from "../api/baseApi";
import { imageUrl } from "../api/config";
import { DeliverModal } from "../components/DeliverModal";
import { DutyToggle } from "../components/DutyToggle";
import { LanguagePicker } from "../components/LanguagePicker";
import { NumberPlate } from "../components/NumberPlate";
import { OrderItemsModal } from "../components/OrderItemsModal";
import { PaymentSlipModal } from "../components/PaymentSlipModal";
import { Screen } from "../components/Screen";
import { StatusDot } from "../components/StatusDot";
import { useToast } from "../components/Toast";
import { UpiQrModal } from "../components/UpiQrModal";
import { useT } from "../i18n/LanguageProvider";
import type { TKey } from "../i18n/translations";
import type { RiderHomeStackParamList } from "../navigation/RiderHomeStack";
import { presentLocalAlert } from "../notifications/push";
import { colors, fonts, fontsAlt, spacing } from "../theme";

const money = (n: number | string) => "₹" + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

// Compact money for the tight stat card — drop paise, use k/L for big sums so
// the value never gets shrunk to an unreadable size.
const moneyCompact = (n: number | string) => {
  const v = Number(n);
  if (v >= 100000) return "₹" + (v / 100000).toFixed(v % 100000 ? 1 : 0).replace(/\.0$/, "") + "L";
  if (v >= 1000) return "₹" + (v / 1000).toFixed(v % 1000 ? 1 : 0).replace(/\.0$/, "") + "k";
  return "₹" + Math.round(v).toLocaleString("en-IN");
};

// "YYYY-MM-DD" → "30 Jun" for the next-day delivery badge.
const shortDay = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" });

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtDay(d: Date) {
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
const dateISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const TINTS = ["#e2ecf9", "#e6f5ec", "#fde2e4", "#f6efdf", "#efe6f7", "#e2f3f5"];
const ACTIVE = ["assigned", "accepted", "picked_up"];
const STATUS_LABEL_KEY: Record<string, TKey> = {
  assigned: "statusNew",
  accepted: "statusAccepted",
  picked_up: "statusOutForDelivery",
};

export default function RiderHomeScreen() {
  const toast = useToast();
  const t = useT();
  const navigation = useNavigation<NativeStackNavigationProp<RiderHomeStackParamList>>();
  const { data: me } = useMeQuery();
  const { data: duty } = useRiderDutyQuery();
  const [setRiderDuty] = useSetRiderDutyMutation();
  const [acceptOrder, { isLoading: accepting }] = useAcceptOrderMutation();
  const [pickupOrder, { isLoading: picking }] = usePickupOrderMutation();

  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [itemsFor, setItemsFor] = useState<RiderDelivery | null>(null);
  const [deliverFor, setDeliverFor] = useState<RiderDelivery | null>(null);
  const [upiFor, setUpiFor] = useState<RiderDelivery | null>(null);
  const [slipFor, setSlipFor] = useState<RiderDelivery | null>(null);
  // Order whose COD was collected via the UPI QR — so the deliver call records it
  // as UPI-collected (vs cash) and it shows in the COD summary.
  const [upiPaidOrder, setUpiPaidOrder] = useState<string | null>(null);
  // Poll so a freshly-assigned order surfaces (and alerts) within ~20s without
  // the rider pulling to refresh.
  const { data: day, refetch } = useRiderDayQuery(dateISO(date), {
    pollingInterval: 20000,
  });

  // Only show the pull-to-refresh spinner for a deliberate pull. The 20s
  // background poll (and re-fetches) update the data silently — no auto spinner.
  const [refreshing, setRefreshing] = useState(false);
  const onPullRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  // In-app alert path: when a brand-new "assigned" order appears, fire a local
  // notification + buzz so the rider is alerted even without remote push (works
  // in Expo Go). Seed the seen-set on first load so existing orders don't alert.
  const seenAssignedRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    const assigned = (day?.deliveries ?? []).filter((d) => d.status === "assigned");
    if (seenAssignedRef.current === null) {
      seenAssignedRef.current = new Set(assigned.map((d) => d.order_number));
      return;
    }
    const seen = seenAssignedRef.current;
    const fresh = assigned.filter((d) => !seen.has(d.order_number));
    fresh.forEach((d) => seen.add(d.order_number));
    if (fresh.length > 0) {
      const d = fresh[0];
      const more = fresh.length > 1 ? " " + t("moreCount", { n: fresh.length - 1 }) : "";
      presentLocalAlert(
        t("newDeliveryAssigned"),
        `${t("orderLabel")} #${d.order_number.slice(0, 8)}${d.address ? " — " + d.address : ""}${more}`,
        { type: "new_assignment", order_number: d.order_number },
      );
    }
  }, [day, t]);

  // Local mirror of duty so the toggle animates immediately, then syncs.
  const [onDuty, setOnDuty] = useState(true);
  useEffect(() => {
    if (duty) setOnDuty(duty.is_on_duty);
  }, [duty?.is_on_duty]);

  const toggleDuty = (v: boolean) => {
    setOnDuty(v);
    setRiderDuty({ on_duty: v })
      .unwrap()
      .catch(() => {
        setOnDuty(!v);
        toast(t("toastDutyFailed"), "error");
      });
  };

  const onDateChange = (event: DateTimePickerEvent, picked?: Date) => {
    setShowPicker(false);
    if (event.type === "set" && picked) setDate(picked);
  };

  const name = me?.name || t("rider");
  const initial = (name[0] || "R").toUpperCase();
  const soon = () => () => toast(t("comingSoon"), "info");

  // Action button advances the assignment: Accept → Pickup → Delivered.
  // Accept/Pickup hit the backend; Delivered (OTP) is wired in a later slice.
  const actionLabel = (s: string) => (s === "assigned" ? t("accept") : s === "accepted" ? t("pickup") : t("deliver"));
  const advance = async (d: RiderDelivery) => {
    if (d.status === "picked_up") {
      setDeliverFor(d); // open the OTP + proof / return sheet
      return;
    }
    try {
      if (d.status === "assigned") {
        await acceptOrder(d.order_number).unwrap();
        toast(t("toastOrderAccepted"));
      } else {
        await pickupOrder(d.order_number).unwrap();
        toast(t("toastPickedUp"));
      }
    } catch {
      toast(t("toastUpdateFailed"), "error");
    }
  };

  const stats = day?.stats;
  const active = (day?.deliveries ?? []).filter((d) => ACTIVE.includes(d.status));
  const current = active[0];
  const rest = active.slice(1);

  return (
    <Screen padded={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onPullRefresh} tintColor={colors.green} colors={[colors.green]} />
        }
      >
        {/* Rider identity + duty toggle */}
        <View style={styles.riderCard}>
          <View style={styles.blob} />
          <View style={styles.riderTop}>
            <View style={styles.avatarCol}>
              <View style={styles.avatar}>
                {me?.avatar ? (
                  <Image source={{ uri: me.avatar }} style={styles.avatarImg} />
                ) : (
                  <Text style={styles.avatarText}>{initial}</Text>
                )}
              </View>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={12} color={colors.yellow} />
                <Text style={styles.ratingText}>4.3</Text>
              </View>
            </View>

            <View style={styles.riderInfo}>
              <Text style={styles.riderName} numberOfLines={1}>{name}</Text>
              <View style={styles.infoLine}>
                <Ionicons name="call-outline" size={12} color="rgba(255,255,255,0.55)" />
                <Text style={styles.infoText} numberOfLines={1}>{me?.phone || "—"}</Text>
              </View>
              <View style={styles.infoLine}>
                <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.55)" />
                <Text style={styles.infoText} numberOfLines={1}>Faizabad, UP</Text>
              </View>
            </View>

            {duty?.vehicle_number ? <NumberPlate number={duty.vehicle_number} style={styles.plate} /> : null}
          </View>

          {/* Language chooser — sits just below the number plate / identity row. */}
          <LanguagePicker />

          <View style={styles.dutyRow}>
            <View style={styles.dutyTextWrap}>
              {/* Status dot — glows + blinks while on duty, static when off. */}
              <StatusDot active={onDuty} color={onDuty ? colors.green : "rgba(255,255,255,0.4)"} />
              <View style={styles.dutyTextCol}>
                <Text style={styles.dutyLabel}>{onDuty ? t("onDuty") : t("offDuty")}</Text>
                <Text style={styles.dutyHint}>
                  {onDuty ? t("acceptingDeliveries") : t("notAcceptingDeliveries")}
                </Text>
              </View>
            </View>
            <DutyToggle value={onDuty} onChange={toggleDuty} />
          </View>
        </View>

        {/* Today's snapshot */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>{t("today")}</Text>
          <Pressable style={styles.datePick} onPress={() => setShowPicker(true)} hitSlop={6}>
            <Ionicons name="calendar-outline" size={15} color={colors.green} />
            <Text style={styles.datePickText}>{fmtDay(date)}</Text>
          </Pressable>
        </View>
        {showPicker ? (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === "ios" ? "inline" : "calendar"}
            maximumDate={new Date()}
            onChange={onDateChange}
          />
        ) : null}
        <View style={styles.statRow}>
          <StatCard
            icon="checkmark-done"
            bg={colors.greenTint}
            fg={colors.green}
            value={String(stats?.delivered ?? 0)}
            label={t("delivered")}
            onPress={() => navigation.navigate("RiderDeliveries", { kind: "delivered" })}
          />
          <StatCard
            icon="time-outline"
            bg={colors.yellowTint}
            fg="#b98421"
            value={String(stats?.pending ?? 0)}
            label={t("pending")}
            onPress={() => navigation.navigate("RiderDeliveries", { kind: "pending" })}
          />
          {/* Returned tile only when there is something returned (like the web). */}
          {(stats?.returned ?? 0) > 0 ? (
            <StatCard
              icon="arrow-undo-outline"
              bg="#fdecd9"
              fg="#b46b00"
              value={String(stats?.returned ?? 0)}
              label={t("returned")}
              onPress={() => navigation.navigate("RiderDeliveries", { kind: "returned" })}
            />
          ) : null}
          <StatCard
            icon="cash-outline"
            bg={colors.greenTint}
            fg={colors.green}
            value={moneyCompact(stats?.earnings ?? 0)}
            label={t("earnings")}
            onPress={() => navigation.navigate("RiderEarnings")}
          />
        </View>

        {/* Cash on delivery */}
        <View style={styles.codCard}>
          <Text style={styles.codLabel}>{t("cashOnDelivery")}</Text>
          <View style={styles.codRow}>
            <View style={styles.codCol}>
              <Text style={styles.codColLabel}>{t("toCollect")}</Text>
              <Text style={styles.codAmount}>{money(stats?.cod_to_collect ?? 0)}</Text>
            </View>
            <View style={[styles.codCol, styles.codColRight]}>
              <Text style={styles.codColLabel}>{t("collected")}</Text>
              <Text style={[styles.codAmount, { color: colors.white }]}>{money(stats?.cod_collected ?? 0)}</Text>
            </View>
          </View>
          {/* How the collected cash split between cash-in-hand and UPI QR
              (paid straight to MilkKart). */}
          <View style={styles.splitRow}>
            <View style={styles.splitCol}>
              <View style={styles.splitHead}>
                <Ionicons name="cash-outline" size={14} color="rgba(255,255,255,0.7)" />
                <Text style={styles.splitLabel}>{t("cashLabel")}</Text>
              </View>
              <Text style={styles.splitAmount}>{money(stats?.cod_collected_cash ?? 0)}</Text>
            </View>
            <View style={styles.splitDivider} />
            <View style={[styles.splitCol, styles.splitColRight]}>
              <View style={styles.splitHead}>
                <Ionicons name="qr-code-outline" size={14} color="rgba(255,255,255,0.7)" />
                <Text style={styles.splitLabel}>{t("upiLabel")}</Text>
              </View>
              <Text style={[styles.splitAmount, { color: colors.green }]}>{money(stats?.cod_collected_upi ?? 0)}</Text>
            </View>
          </View>
        </View>

        {/* Active deliveries */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>{t("activeDeliveries")}</Text>
          {active.length ? <Text style={styles.pendingPill}>{t("pendingCount", { n: active.length })}</Text> : null}
        </View>

        {current ? (
          <View style={styles.currentCard}>
            <View style={styles.currentTop}>
              <Text style={styles.currentTag}>● {STATUS_LABEL_KEY[current.status] ? t(STATUS_LABEL_KEY[current.status]) : "CURRENT"}</Text>
              <Text style={styles.orderNo}>#{current.order_number.slice(0, 8)}</Text>
            </View>
            <View style={styles.currentBody}>
              <ThumbStack images={current.item_images} count={current.item_count} size={44} onPress={() => setItemsFor(current)} />
              <View style={styles.amountCol}>
                <Text style={styles.deliveryAmount}>{money(current.total)}</Text>
                <Text style={current.is_cod ? styles.collectCod : styles.collectPrepaid}>
                  {current.is_cod ? t("collectCash") : t("prepaid")}
                </Text>
              </View>
            </View>
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={14} color={colors.muted} style={{ marginTop: 1 }} />
              <Text style={styles.fullAddress}>{current.address}</Text>
            </View>
            {current.delivery_type === "next_day" ? (
              <View style={styles.nextDay}>
                <View style={styles.nextDayIcon}>
                  <Ionicons name="calendar" size={15} color={colors.white} />
                </View>
                <Text style={styles.nextDayLabel} numberOfLines={1}>Next-day delivery</Text>
                {current.delivery_date ? (
                  <View style={styles.nextDayDate}>
                    <Text style={styles.nextDayDateText}>{shortDay(current.delivery_date)}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}
            {/* COD orders can be paid by UPI — show a QR for the order amount. */}
            {current.is_cod ? (
              <Pressable style={({ pressed }) => [styles.upiBtn, pressed && { opacity: 0.85 }]} onPress={() => setUpiFor(current)}>
                <Ionicons name="qr-code-outline" size={16} color={colors.green} />
                <Text style={styles.upiBtnText}>{t("collectViaUpi")}</Text>
              </Pressable>
            ) : null}
            <View style={styles.actionRow}>
              <Pressable
                style={styles.navigateBtn}
                onPress={() =>
                  navigation.navigate("RiderNavigate", {
                    orderNumber: current.order_number,
                    address: current.address,
                    destLat: current.dest_lat,
                    destLng: current.dest_lng,
                  })
                }
              >
                <Ionicons name="navigate-outline" size={16} color={colors.green} />
                <Text style={styles.navigateText}>{t("navigate")}</Text>
              </Pressable>
              {/* Call the customer — only once the order is accepted/picked up
                  (after the rider taps Accept), not while it's just assigned. */}
              {current.status !== "assigned" ? (
                <Pressable
                  style={styles.callBtn}
                  onPress={() =>
                    current.customer_phone ? Linking.openURL(`tel:${current.customer_phone}`) : toast(t("comingSoon"), "info")
                  }
                >
                  <Ionicons name="call" size={17} color={colors.green} />
                </Pressable>
              ) : null}
              <Pressable
                style={({ pressed }) => [styles.deliveredBtn, (pressed || accepting || picking) && { opacity: 0.85 }]}
                onPress={() => advance(current)}
                disabled={accepting || picking}
              >
                <Text style={styles.deliveredText}>{actionLabel(current.status)}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="bicycle-outline" size={22} color={colors.muted} />
            <Text style={styles.emptyText}>{t("noActiveDeliveries")}</Text>
          </View>
        )}

        {/* Upcoming deliveries */}
        {rest.map((d) => (
          <DeliveryRow key={d.order_number} d={d} onOpen={() => setItemsFor(d)} />
        ))}

        {active.length ? (
          <Pressable style={styles.viewAllBtn} onPress={soon()}>
            <Text style={styles.viewAllText}>{t("viewAllDeliveries")}</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <OrderItemsModal delivery={itemsFor} onClose={() => setItemsFor(null)} />
      <DeliverModal
        delivery={deliverFor}
        paidViaUpi={!!deliverFor && deliverFor.order_number === upiPaidOrder}
        onClose={() => {
          if (deliverFor && deliverFor.order_number === upiPaidOrder) setUpiPaidOrder(null);
          setDeliverFor(null);
        }}
      />
      <UpiQrModal
        delivery={upiFor}
        onClose={() => setUpiFor(null)}
        onPaid={() => {
          const d = upiFor;
          setUpiFor(null);
          // Remember this order was paid via UPI so the deliver step records it.
          if (d) setUpiPaidOrder(d.order_number);
          // Generate the payment slip once the rider confirms payment. Stagger
          // so the QR sheet finishes dismissing first (avoids overlapping modals).
          if (d) setTimeout(() => setSlipFor(d), 280);
        }}
      />
      <PaymentSlipModal
        delivery={slipFor}
        onClose={() => setSlipFor(null)}
        onContinue={() => {
          const d = slipFor;
          setSlipFor(null);
          // Continue to the OTP / confirm-delivery sheet after the slip.
          if (d) setTimeout(() => setDeliverFor(d), 280);
        }}
      />
    </Screen>
  );
}

// Overlapping product thumbnails + a "+N" chip — same treatment as the My Orders
// card. Tap to open the order's item list.
function ThumbStack({
  images,
  count,
  size,
  onPress,
}: {
  images: string[];
  count: number;
  size: number;
  onPress: () => void;
}) {
  const shown = Math.min(count, 2);
  const extra = Math.max(0, count - 2);
  return (
    <Pressable style={styles.thumbs} onPress={onPress} hitSlop={6}>
      {Array.from({ length: Math.max(shown, 1) }).map((_, i) => {
        const img = imageUrl(images?.[i]);
        return (
          <View
            key={i}
            style={[styles.thumb, { width: size, height: size, marginLeft: i === 0 ? 0 : -14, backgroundColor: TINTS[i % TINTS.length] }]}
          >
            {img ? <Image source={{ uri: img }} style={styles.thumbImg} resizeMode="contain" /> : null}
          </View>
        );
      })}
      {extra > 0 ? (
        <View style={[styles.thumb, styles.thumbMore, { width: size, height: size, marginLeft: -14 }]}>
          <Text style={styles.thumbMoreText}>+{extra}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function DeliveryRow({ d, onOpen }: { d: RiderDelivery; onOpen: () => void }) {
  const t = useT();
  return (
    <View style={styles.deliveryRow}>
      <ThumbStack images={d.item_images} count={d.item_count} size={40} onPress={onOpen} />
      <View style={styles.rowInfo}>
        <View style={styles.rowNameLine}>
          <Text style={styles.deliveryName} numberOfLines={1}>{d.address}</Text>
          <View style={[styles.payPill, d.is_cod ? styles.payCod : styles.payPrepaid]}>
            <Text style={[styles.payText, d.is_cod ? styles.payTextCod : styles.payTextPrepaid]}>
              {d.is_cod ? t("codShort") : t("prepaidShort")}
            </Text>
          </View>
        </View>
        <Text style={styles.deliveryAddr} numberOfLines={1}>
          #{d.order_number.slice(0, 8)}
          {d.delivery_type === "next_day" ? ` · Next-day${d.delivery_date ? ` ${shortDay(d.delivery_date)}` : ""}` : ""}
        </Text>
      </View>
      <Text style={styles.deliveryAmount}>{money(d.total)}</Text>
    </View>
  );
}

function StatCard({
  icon,
  bg,
  fg,
  value,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  bg: string;
  fg: string;
  value: string;
  label: string;
  // When set, the card becomes tappable (opens that status' history list).
  onPress?: () => void;
}) {
  const Container: any = onPress ? Pressable : View;
  return (
    <Container
      style={({ pressed }: { pressed?: boolean }) => [styles.statCard, { backgroundColor: bg }, pressed && { opacity: 0.85 }]}
      onPress={onPress}
    >
      {/* Icon, value and label stacked vertically (centered) so the value never
          overlaps the icon — even for wide values like earnings. */}
      <Ionicons name={icon} size={18} color={fg} />
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </Text>
      <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
    </Container>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing(2.5), paddingTop: spacing(1), paddingBottom: spacing(4) },

  // Rider identity card
  riderCard: { backgroundColor: colors.heading, borderRadius: 22, padding: spacing(2.25), overflow: "hidden" },
  blob: { position: "absolute", top: -40, right: -28, width: 130, height: 130, borderRadius: 65, backgroundColor: "rgba(255,255,255,0.05)" },
  riderTop: { flexDirection: "row", alignItems: "flex-start" },
  avatarCol: { alignItems: "center" },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.green, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarText: { fontFamily: fonts.bold, fontSize: 20, color: colors.white },
  avatarImg: { width: "100%", height: "100%" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 6 },
  ratingText: { fontFamily: fonts.bold, fontSize: 13, color: colors.yellow },
  riderInfo: { flex: 1, marginLeft: spacing(1.5), paddingTop: 2 },
  riderName: { fontFamily: fonts.bold, fontSize: 17, color: colors.white },
  infoLine: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  infoText: { flexShrink: 1, fontFamily: fontsAlt.regular, fontSize: 12, color: "rgba(255,255,255,0.7)" },
  plate: { marginLeft: spacing(1.5), alignSelf: "flex-start" },
  dutyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing(2),
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    paddingVertical: spacing(1.25),
    paddingHorizontal: spacing(1.75),
  },
  dutyTextWrap: { flex: 1, flexDirection: "row", alignItems: "center", gap: 9 },
  dutyTextCol: { flex: 1 },
  dutyLabel: { fontFamily: fonts.bold, fontSize: 15, color: colors.white },
  dutyHint: { fontFamily: fontsAlt.regular, fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 },

  // Section headers
  sectionHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: spacing(2.75), marginBottom: spacing(1.25) },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.heading },
  sectionMeta: { fontFamily: fontsAlt.regular, fontSize: 13, color: colors.muted },
  datePick: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.greenTint, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 11 },
  datePickText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.green },
  pendingPill: { fontFamily: fontsAlt.extrabold, fontSize: 11, letterSpacing: 0.5, color: "#b98421" },

  // Stat cards
  statRow: { flexDirection: "row", gap: spacing(1.25) },
  statCard: { flex: 1, borderRadius: 16, paddingVertical: spacing(1.5), paddingHorizontal: spacing(1), alignItems: "center" },
  statValue: { textAlign: "center", fontFamily: fonts.bold, fontSize: 16, color: colors.heading, marginTop: 6 },
  statLabel: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginTop: 4, textAlign: "center" },

  // Cash-on-delivery card
  codCard: { backgroundColor: colors.heading, borderRadius: 18, padding: spacing(2), marginTop: spacing(2.5), overflow: "hidden" },
  codLabel: { fontFamily: fontsAlt.extrabold, fontSize: 11, letterSpacing: 1, color: "rgba(255,255,255,0.55)" },
  codRow: { flexDirection: "row", marginTop: spacing(1.5) },
  codCol: { flex: 1 },
  // Right column aligns its label + amount to the card's right edge so
  // "Collected" mirrors "To collect" on the left.
  codColRight: { alignItems: "flex-end" },
  codColLabel: { fontFamily: fontsAlt.regular, fontSize: 12, color: "rgba(255,255,255,0.6)" },
  codAmount: { fontFamily: fonts.bold, fontSize: 22, color: colors.yellow, marginTop: 3 },
  splitRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(1.75),
    marginTop: spacing(2),
  },
  splitCol: { flex: 1 },
  splitColRight: { alignItems: "flex-end" },
  splitDivider: { width: 1, alignSelf: "stretch", backgroundColor: "rgba(255,255,255,0.12)", marginHorizontal: spacing(1.5) },
  splitHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  splitLabel: { fontFamily: fontsAlt.regular, fontSize: 12, color: "rgba(255,255,255,0.7)" },
  splitAmount: { fontFamily: fonts.bold, fontSize: 17, color: colors.white, marginTop: 4 },

  // Current delivery
  currentCard: { backgroundColor: colors.bg, borderRadius: 16, borderWidth: 1.5, borderColor: colors.green, padding: spacing(1.75) },
  currentTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  currentTag: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.3, color: colors.green },
  orderNo: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted },
  currentBody: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginTop: spacing(1.5) },
  amountCol: { alignItems: "flex-end" },
  collectCod: { fontFamily: fonts.semibold, fontSize: 12, color: "#b98421", marginTop: 2 },
  collectPrepaid: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  addressRow: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: spacing(1.5) },
  fullAddress: { flex: 1, fontFamily: fontsAlt.regular, fontSize: 13, color: colors.text, lineHeight: 19 },
  nextDay: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1),
    backgroundColor: "#fff7e6",
    borderWidth: 1,
    borderColor: "#f3dca6",
    borderRadius: 12,
    paddingVertical: spacing(0.75),
    paddingHorizontal: spacing(0.75),
    marginTop: spacing(1.25),
  },
  nextDayIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#d9920a",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#d9920a",
    shadowOpacity: 0.32,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  nextDayLabel: { flex: 1, fontFamily: fonts.bold, fontSize: 13, color: "#8a6216" },
  nextDayDate: {
    backgroundColor: "#f6e2b0",
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 10,
    marginRight: spacing(0.5),
  },
  nextDayDateText: { fontFamily: fontsAlt.extrabold, fontSize: 11, letterSpacing: 0.3, color: "#92610a" },

  // Product thumbnail stack (like My Orders)
  thumbs: { flexDirection: "row" },
  thumb: { borderRadius: 10, borderWidth: 2, borderColor: colors.bg, overflow: "hidden" },
  thumbImg: { width: "100%", height: "100%" },
  thumbMore: { backgroundColor: colors.lineSoft, alignItems: "center", justifyContent: "center" },
  thumbMoreText: { fontFamily: fonts.bold, fontSize: 13, color: colors.heading },
  deliveryName: { flexShrink: 1, fontFamily: fonts.bold, fontSize: 15, color: colors.heading },
  deliveryAddr: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  deliveryAmount: { fontFamily: fonts.bold, fontSize: 15, color: colors.heading, marginLeft: spacing(1) },
  upiBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, height: 44, borderRadius: 12, backgroundColor: colors.greenTint, marginTop: spacing(1.25) },
  upiBtnText: { fontFamily: fonts.bold, fontSize: 14, color: colors.green },
  actionRow: { flexDirection: "row", alignItems: "center", gap: spacing(1.25), marginTop: spacing(1.75) },
  navigateBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: colors.green },
  navigateText: { fontFamily: fonts.bold, fontSize: 14, color: colors.green },
  callBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.greenTint, alignItems: "center", justifyContent: "center" },
  deliveredBtn: { flex: 1, height: 44, borderRadius: 12, backgroundColor: colors.green, alignItems: "center", justifyContent: "center" },
  deliveredText: { fontFamily: fonts.bold, fontSize: 14, color: colors.white },

  // Upcoming delivery rows
  deliveryRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.bg, borderRadius: 16, borderWidth: 1, borderColor: colors.lineSoft, padding: spacing(1.5), marginTop: spacing(1.25) },
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

  emptyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.25),
    backgroundColor: colors.bgSoft,
    borderRadius: 16,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(1.75),
  },
  emptyText: { fontFamily: fontsAlt.regular, fontSize: 14, color: colors.muted },
});
