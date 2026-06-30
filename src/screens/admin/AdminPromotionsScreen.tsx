import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Alert, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import {
  AdminBanner,
  AdminCoupon,
  useAdminBannersQuery,
  useAdminCouponsQuery,
  useAdminCreateBannerMutation,
  useAdminCreateCouponMutation,
  useAdminDeleteBannerMutation,
  useAdminDeleteCouponMutation,
  useAdminUpdateBannerMutation,
  useAdminUpdateCouponMutation,
} from "../../api/baseApi";
import { Screen } from "../../components/Screen";
import { ListSkeleton } from "../../components/Skeleton";
import { useToast } from "../../components/Toast";
import { colors, fonts, fontsAlt, spacing } from "../../theme";

const dayLabel = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
const discountText = (c: AdminCoupon) => (c.discount_type === "percent" ? `${Number(c.value)}% off` : `₹${Number(c.value)} off`);

export default function AdminPromotionsScreen() {
  const navigation = useNavigation();
  const toast = useToast();
  const [tab, setTab] = useState<"coupons" | "banners">("coupons");
  const [couponEdit, setCouponEdit] = useState<AdminCoupon | "new" | null>(null);
  const [bannerEdit, setBannerEdit] = useState<AdminBanner | "new" | null>(null);

  const coupons = useAdminCouponsQuery();
  const banners = useAdminBannersQuery();
  const [updateCoupon] = useAdminUpdateCouponMutation();
  const [deleteCoupon] = useAdminDeleteCouponMutation();
  const [updateBanner] = useAdminUpdateBannerMutation();
  const [deleteBanner] = useAdminDeleteBannerMutation();

  const confirmDelete = (label: string, onYes: () => void) =>
    Alert.alert("Delete", `Delete ${label}?`, [
      { text: "Keep", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: onYes },
    ]);

  return (
    <Screen padded={false} style={{ backgroundColor: colors.bgSoft }}>
      <View style={styles.header}>
        <View style={styles.blob} />
        <View style={styles.headerRow}>
          <Pressable style={styles.back} onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="arrow-back" size={20} color={colors.white} />
          </Pressable>
          <Text style={styles.headerTitle}>Promotions</Text>
          <Pressable style={styles.addBtn} onPress={() => (tab === "coupons" ? setCouponEdit("new") : setBannerEdit("new"))} hitSlop={8}>
            <Ionicons name="add" size={22} color={colors.heading} />
          </Pressable>
        </View>
        <View style={styles.segment}>
          {(["coupons", "banners"] as const).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={[styles.segBtn, tab === t && styles.segBtnActive]}>
              <Text style={[styles.segText, tab === t && styles.segTextActive]}>{t === "coupons" ? "Coupons" : "Banners"}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {tab === "coupons" ? (
        coupons.isLoading ? (
          <ListSkeleton rows={5} thumb={false} />
        ) : (
          <ScrollView
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={coupons.isFetching} onRefresh={coupons.refetch} tintColor={colors.green} colors={[colors.green]} />}
          >
            {(coupons.data ?? []).map((c) => (
              <Pressable key={c.id} style={styles.card} onPress={() => setCouponEdit(c)}>
                <View style={styles.cardTop}>
                  <View style={styles.codeWrap}>
                    <Ionicons name="pricetag" size={14} color={colors.green} />
                    <Text style={styles.code}>{c.code}</Text>
                  </View>
                  <Switch value={c.is_active} onValueChange={() => { updateCoupon({ id: c.id, is_active: !c.is_active }); }} trackColor={{ true: colors.green }} thumbColor={colors.white} />
                </View>
                <Text style={styles.cardDesc} numberOfLines={1}>{discountText(c)} · {c.description || "No description"}</Text>
                <View style={styles.cardMetaRow}>
                  <Text style={styles.cardMeta}>
                    Min ₹{Number(c.min_order_value)} · used {c.times_used}{c.usage_limit ? `/${c.usage_limit}` : ""}
                  </Text>
                  <Pressable hitSlop={8} onPress={() => confirmDelete(c.code, () => deleteCoupon(c.id))}>
                    <Ionicons name="trash-outline" size={17} color={colors.error} />
                  </Pressable>
                </View>
                <Text style={styles.validity}>Valid {dayLabel(c.valid_from)} → {dayLabel(c.valid_until)}</Text>
              </Pressable>
            ))}
            {(coupons.data ?? []).length === 0 ? <Text style={styles.emptySub}>No coupons yet. Tap + to add one.</Text> : null}
          </ScrollView>
        )
      ) : banners.isLoading ? (
        <ListSkeleton rows={5} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={banners.isFetching} onRefresh={banners.refetch} tintColor={colors.green} colors={[colors.green]} />}
        >
          {(banners.data ?? []).map((b) => (
            <Pressable key={b.id} style={styles.card} onPress={() => setBannerEdit(b)}>
              <View style={styles.cardTop}>
                <Text style={styles.bannerTitle} numberOfLines={1}>{b.title || "Untitled banner"}</Text>
                <Switch value={b.is_active} onValueChange={() => { updateBanner({ id: b.id, is_active: !b.is_active }); }} trackColor={{ true: colors.green }} thumbColor={colors.white} />
              </View>
              {b.subtitle ? <Text style={styles.cardDesc} numberOfLines={1}>{b.subtitle}</Text> : null}
              <View style={styles.cardMetaRow}>
                <Text style={styles.cardMeta}>Order {b.sort_order}{b.link_url ? ` · ${b.link_url}` : ""}</Text>
                <Pressable hitSlop={8} onPress={() => confirmDelete(b.title || "this banner", () => deleteBanner(b.id))}>
                  <Ionicons name="trash-outline" size={17} color={colors.error} />
                </Pressable>
              </View>
            </Pressable>
          ))}
          {(banners.data ?? []).length === 0 ? <Text style={styles.emptySub}>No banners yet. Tap + to add one.</Text> : null}
        </ScrollView>
      )}

      {couponEdit ? <CouponSheet coupon={couponEdit === "new" ? null : couponEdit} onClose={() => setCouponEdit(null)} /> : null}
      {bannerEdit ? <BannerSheet banner={bannerEdit === "new" ? null : bannerEdit} onClose={() => setBannerEdit(null)} /> : null}
    </Screen>
  );
}

// ---- coupon editor --------------------------------------------------------
function CouponSheet({ coupon, onClose }: { coupon: AdminCoupon | null; onClose: () => void }) {
  const toast = useToast();
  const [createCoupon, { isLoading: creating }] = useAdminCreateCouponMutation();
  const [updateCoupon, { isLoading: updating }] = useAdminUpdateCouponMutation();
  const plus90 = () => { const d = new Date(); d.setDate(d.getDate() + 90); return d; };

  const [code, setCode] = useState(coupon?.code ?? "");
  const [description, setDescription] = useState(coupon?.description ?? "");
  const [type, setType] = useState<"flat" | "percent">(coupon?.discount_type ?? "flat");
  const [value, setValue] = useState(coupon ? String(Number(coupon.value)) : "");
  const [minOrder, setMinOrder] = useState(coupon ? String(Number(coupon.min_order_value)) : "0");
  const [maxDiscount, setMaxDiscount] = useState(coupon?.max_discount ? String(Number(coupon.max_discount)) : "");
  const [usageLimit, setUsageLimit] = useState(coupon?.usage_limit != null ? String(coupon.usage_limit) : "");
  const [perUser, setPerUser] = useState(String(coupon?.per_user_limit ?? 1));
  const [firstOnly, setFirstOnly] = useState(coupon?.first_order_only ?? false);
  const [active, setActive] = useState(coupon?.is_active ?? true);
  const [from, setFrom] = useState<Date>(coupon ? new Date(coupon.valid_from) : new Date());
  const [until, setUntil] = useState<Date>(coupon ? new Date(coupon.valid_until) : plus90());
  const [picker, setPicker] = useState<"from" | "until" | null>(null);
  const saving = creating || updating;

  function onPick(e: DateTimePickerEvent, d?: Date) {
    const which = picker;
    setPicker(null);
    if (e.type !== "set" || !d) return;
    if (which === "from") setFrom(d);
    else setUntil(d);
  }

  async function save() {
    if (!code.trim()) return toast("Enter a coupon code.", "info");
    if (!value.trim()) return toast("Enter the discount value.", "info");
    const body: any = {
      code: code.trim().toUpperCase(),
      description: description.trim(),
      discount_type: type,
      value: value.trim(),
      min_order_value: minOrder.trim() || "0",
      max_discount: type === "percent" && maxDiscount.trim() ? maxDiscount.trim() : null,
      usage_limit: usageLimit.trim() ? parseInt(usageLimit, 10) : null,
      per_user_limit: parseInt(perUser, 10) || 1,
      first_order_only: firstOnly,
      is_active: active,
      valid_from: from.toISOString(),
      valid_until: until.toISOString(),
    };
    try {
      if (coupon) await updateCoupon({ id: coupon.id, ...body }).unwrap();
      else await createCoupon(body).unwrap();
      toast(coupon ? "Coupon saved" : "Coupon created");
      onClose();
    } catch (e: any) {
      toast(e?.data?.code?.[0] || e?.data?.detail || "Couldn't save the coupon.", "error");
    }
  }

  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={sheet.backdrop} onPress={onClose} />
      <View style={[sheet.sheet, { maxHeight: "90%" }]}>
        <View style={sheet.handle} />
        <Text style={sheet.title}>{coupon ? "Edit coupon" : "New coupon"}</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Lbl t="Code" />
          <TextInput style={sheet.input} value={code} onChangeText={setCode} autoCapitalize="characters" placeholder="SAVE20" placeholderTextColor={colors.muted} />
          <Lbl t="Description" />
          <TextInput style={sheet.input} value={description} onChangeText={setDescription} placeholder="₹20 off on ₹99+" placeholderTextColor={colors.muted} />

          <Lbl t="Discount type" />
          <View style={sheet.segRow}>
            {(["flat", "percent"] as const).map((tp) => (
              <Pressable key={tp} onPress={() => setType(tp)} style={[sheet.segChip, type === tp && sheet.segChipActive]}>
                <Text style={[sheet.segChipText, type === tp && sheet.segChipTextActive]}>{tp === "flat" ? "Flat ₹" : "Percent %"}</Text>
              </Pressable>
            ))}
          </View>

          <View style={sheet.row}>
            <View style={{ flex: 1 }}><Lbl t={type === "percent" ? "Percent" : "Amount ₹"} /><TextInput style={sheet.input} value={value} onChangeText={setValue} keyboardType="decimal-pad" placeholder={type === "percent" ? "10" : "20"} placeholderTextColor={colors.muted} /></View>
            <View style={{ flex: 1 }}><Lbl t="Min order ₹" /><TextInput style={sheet.input} value={minOrder} onChangeText={setMinOrder} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.muted} /></View>
          </View>
          {type === "percent" ? (<><Lbl t="Max discount ₹ (optional)" /><TextInput style={sheet.input} value={maxDiscount} onChangeText={setMaxDiscount} keyboardType="decimal-pad" placeholder="No cap" placeholderTextColor={colors.muted} /></>) : null}

          <View style={sheet.row}>
            <View style={{ flex: 1 }}><Lbl t="Total uses (blank = ∞)" /><TextInput style={sheet.input} value={usageLimit} onChangeText={setUsageLimit} keyboardType="number-pad" placeholder="∞" placeholderTextColor={colors.muted} /></View>
            <View style={{ flex: 1 }}><Lbl t="Per user" /><TextInput style={sheet.input} value={perUser} onChangeText={setPerUser} keyboardType="number-pad" placeholder="1" placeholderTextColor={colors.muted} /></View>
          </View>

          <View style={sheet.row}>
            <Pressable style={[sheet.dateBtn, { flex: 1 }]} onPress={() => setPicker("from")}><Text style={sheet.dateCap}>VALID FROM</Text><Text style={sheet.dateVal}>{dayLabel(from.toISOString())}</Text></Pressable>
            <Pressable style={[sheet.dateBtn, { flex: 1 }]} onPress={() => setPicker("until")}><Text style={sheet.dateCap}>VALID UNTIL</Text><Text style={sheet.dateVal}>{dayLabel(until.toISOString())}</Text></Pressable>
          </View>
          {picker ? (
            <DateTimePicker value={picker === "from" ? from : until} mode="date" display={Platform.OS === "ios" ? "inline" : "calendar"} onChange={onPick} />
          ) : null}

          <View style={sheet.switchRow}><Text style={sheet.switchLabel}>First order only</Text><Switch value={firstOnly} onValueChange={setFirstOnly} trackColor={{ true: colors.green }} thumbColor={colors.white} /></View>
          <View style={sheet.switchRow}><Text style={sheet.switchLabel}>Active</Text><Switch value={active} onValueChange={setActive} trackColor={{ true: colors.green }} thumbColor={colors.white} /></View>
        </ScrollView>
        <View style={sheet.actions}>
          <Pressable style={[sheet.btn, sheet.btnGhost]} onPress={onClose}><Text style={sheet.btnGhostText}>Cancel</Text></Pressable>
          <Pressable style={[sheet.btn, sheet.btnPrimary, saving && { opacity: 0.7 }]} onPress={save} disabled={saving}><Text style={sheet.btnPrimaryText}>{saving ? "Saving…" : "Save"}</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ---- banner editor --------------------------------------------------------
function BannerSheet({ banner, onClose }: { banner: AdminBanner | null; onClose: () => void }) {
  const toast = useToast();
  const [createBanner, { isLoading: creating }] = useAdminCreateBannerMutation();
  const [updateBanner, { isLoading: updating }] = useAdminUpdateBannerMutation();
  const [title, setTitle] = useState(banner?.title ?? "");
  const [subtitle, setSubtitle] = useState(banner?.subtitle ?? "");
  const [imageUrl, setImageUrl] = useState(banner?.image_url ?? "");
  const [linkUrl, setLinkUrl] = useState(banner?.link_url ?? "");
  const [bgColor, setBgColor] = useState(banner?.bg_color ?? "");
  const [sortOrder, setSortOrder] = useState(String(banner?.sort_order ?? 0));
  const [active, setActive] = useState(banner?.is_active ?? true);
  const saving = creating || updating;

  async function save() {
    if (!title.trim()) return toast("Give the banner a title.", "info");
    const body = { title: title.trim(), subtitle: subtitle.trim(), image_url: imageUrl.trim(), link_url: linkUrl.trim(), bg_color: bgColor.trim(), sort_order: parseInt(sortOrder, 10) || 0, is_active: active };
    try {
      if (banner) await updateBanner({ id: banner.id, ...body }).unwrap();
      else await createBanner(body).unwrap();
      toast(banner ? "Banner saved" : "Banner created");
      onClose();
    } catch (e: any) {
      toast(e?.data?.detail || "Couldn't save the banner.", "error");
    }
  }

  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={sheet.backdrop} onPress={onClose} />
      <View style={[sheet.sheet, { maxHeight: "88%" }]}>
        <View style={sheet.handle} />
        <Text style={sheet.title}>{banner ? "Edit banner" : "New banner"}</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Lbl t="Title" />
          <TextInput style={sheet.input} value={title} onChangeText={setTitle} placeholder="Fresh milk, delivered daily" placeholderTextColor={colors.muted} />
          <Lbl t="Subtitle" />
          <TextInput style={sheet.input} value={subtitle} onChangeText={setSubtitle} placeholder="Subscribe & save" placeholderTextColor={colors.muted} />
          <Lbl t="Image URL" />
          <TextInput style={sheet.input} value={imageUrl} onChangeText={setImageUrl} autoCapitalize="none" placeholder="https://…" placeholderTextColor={colors.muted} />
          <Lbl t="Link URL" />
          <TextInput style={sheet.input} value={linkUrl} onChangeText={setLinkUrl} autoCapitalize="none" placeholder="subscriptions.html" placeholderTextColor={colors.muted} />
          <Lbl t="Background (color or CSS gradient)" />
          <TextInput style={sheet.input} value={bgColor} onChangeText={setBgColor} autoCapitalize="none" placeholder="#3bb77e" placeholderTextColor={colors.muted} />
          <Lbl t="Sort order" />
          <TextInput style={sheet.input} value={sortOrder} onChangeText={setSortOrder} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.muted} />
          <View style={sheet.switchRow}><Text style={sheet.switchLabel}>Active</Text><Switch value={active} onValueChange={setActive} trackColor={{ true: colors.green }} thumbColor={colors.white} /></View>
        </ScrollView>
        <View style={sheet.actions}>
          <Pressable style={[sheet.btn, sheet.btnGhost]} onPress={onClose}><Text style={sheet.btnGhostText}>Cancel</Text></Pressable>
          <Pressable style={[sheet.btn, sheet.btnPrimary, saving && { opacity: 0.7 }]} onPress={save} disabled={saving}><Text style={sheet.btnPrimaryText}>{saving ? "Saving…" : "Save"}</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

const Lbl = ({ t }: { t: string }) => <Text style={sheet.label}>{t}</Text>;

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.heading, borderRadius: 26, marginHorizontal: spacing(2.5), marginTop: spacing(1),
    paddingHorizontal: spacing(2.5), paddingTop: spacing(2.5), paddingBottom: spacing(2), overflow: "hidden",
  },
  blob: { position: "absolute", top: -45, right: -30, width: 150, height: 150, borderRadius: 75, backgroundColor: "rgba(255,255,255,0.06)" },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing(1.5) },
  back: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontFamily: fonts.bold, fontSize: 22, color: colors.white },
  addBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  segment: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 12, padding: 4, marginTop: spacing(2) },
  segBtn: { flex: 1, paddingVertical: spacing(1), borderRadius: 9, alignItems: "center" },
  segBtnActive: { backgroundColor: colors.white },
  segText: { fontFamily: fonts.bold, fontSize: 14, color: "rgba(255,255,255,0.8)" },
  segTextActive: { color: colors.heading },

  list: { paddingHorizontal: spacing(2.5), paddingTop: spacing(2), paddingBottom: spacing(4) },
  card: { backgroundColor: colors.bg, borderRadius: 16, borderWidth: 1, borderColor: colors.lineSoft, padding: spacing(1.75), marginBottom: spacing(1.25), shadowColor: "#1c2b36", shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  codeWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  code: { fontFamily: fonts.bold, fontSize: 16, color: colors.heading, letterSpacing: 0.5 },
  bannerTitle: { flex: 1, fontFamily: fonts.bold, fontSize: 15, color: colors.heading },
  cardDesc: { fontFamily: fontsAlt.regular, fontSize: 13, color: colors.text, marginTop: spacing(0.75) },
  cardMetaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing(1) },
  cardMeta: { flex: 1, fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted },
  validity: { fontFamily: fontsAlt.regular, fontSize: 11, color: colors.muted, marginTop: spacing(0.75) },
  emptySub: { fontFamily: fontsAlt.regular, fontSize: 13, color: colors.muted, textAlign: "center", marginTop: spacing(4) },
});

const sheet = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: spacing(2.5), paddingTop: spacing(1.25), paddingBottom: spacing(3) },
  handle: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: spacing(1.5) },
  title: { fontFamily: fonts.bold, fontSize: 18, color: colors.heading, marginBottom: spacing(0.5) },
  label: { fontFamily: fontsAlt.extrabold, fontSize: 11, letterSpacing: 0.8, color: colors.muted, marginTop: spacing(1.5), marginBottom: spacing(0.75) },
  input: { backgroundColor: colors.bgSoft, borderRadius: 12, borderWidth: 1, borderColor: colors.line, paddingHorizontal: spacing(1.75), paddingVertical: spacing(1.5), fontFamily: fonts.medium, fontSize: 15, color: colors.heading },
  row: { flexDirection: "row", gap: spacing(1.5) },
  segRow: { flexDirection: "row", gap: spacing(1) },
  segChip: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: colors.line, paddingVertical: spacing(1.25), alignItems: "center", backgroundColor: colors.bg },
  segChipActive: { borderColor: colors.green, backgroundColor: colors.greenTint },
  segChipText: { fontFamily: fonts.bold, fontSize: 13, color: colors.heading },
  segChipTextActive: { color: colors.green },
  dateBtn: { backgroundColor: colors.bgSoft, borderRadius: 12, borderWidth: 1, borderColor: colors.line, paddingHorizontal: spacing(1.5), paddingVertical: spacing(1.25), marginTop: spacing(1.5) },
  dateCap: { fontFamily: fontsAlt.extrabold, fontSize: 9, letterSpacing: 0.6, color: colors.muted },
  dateVal: { fontFamily: fonts.bold, fontSize: 13, color: colors.heading, marginTop: 2 },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing(1.25) },
  switchLabel: { fontFamily: fonts.semibold, fontSize: 14, color: colors.heading },
  actions: { flexDirection: "row", gap: spacing(1.25), marginTop: spacing(1.5) },
  btn: { flex: 1, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  btnPrimary: { backgroundColor: colors.green },
  btnPrimaryText: { fontFamily: fonts.bold, fontSize: 15, color: colors.white },
  btnGhost: { backgroundColor: colors.bgSoft },
  btnGhostText: { fontFamily: fonts.bold, fontSize: 15, color: colors.heading },
});
