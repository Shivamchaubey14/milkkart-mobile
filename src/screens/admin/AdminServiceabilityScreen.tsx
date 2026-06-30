import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import {
  DeliveryZone,
  ServiceableArea,
  useAdminAreasQuery,
  useAdminCreateAreaMutation,
  useAdminDeleteAreaMutation,
  useAdminDeleteZoneMutation,
  useAdminUpdateAreaMutation,
  useAdminUpdateZoneMutation,
  useAdminZonesQuery,
} from "../../api/baseApi";
import { Screen } from "../../components/Screen";
import { ListSkeleton } from "../../components/Skeleton";
import { useToast } from "../../components/Toast";
import { colors, fonts, fontsAlt, spacing } from "../../theme";

function ringCount(zone: DeliveryZone): number {
  const c: any = zone.polygon?.coordinates;
  try {
    if (zone.polygon.type === "Polygon") return (c?.[0]?.length ?? 0);
    if (zone.polygon.type === "MultiPolygon") return (c ?? []).reduce((n: number, poly: any) => n + (poly?.[0]?.length ?? 0), 0);
  } catch {
    /* ignore */
  }
  return 0;
}

export default function AdminServiceabilityScreen() {
  const navigation = useNavigation();
  const [tab, setTab] = useState<"areas" | "zones">("areas");
  const [editing, setEditing] = useState<ServiceableArea | "new" | null>(null);

  const areas = useAdminAreasQuery();
  const zones = useAdminZonesQuery();
  const [updateArea] = useAdminUpdateAreaMutation();
  const [deleteArea] = useAdminDeleteAreaMutation();
  const [updateZone] = useAdminUpdateZoneMutation();
  const [deleteZone] = useAdminDeleteZoneMutation();

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
          <Text style={styles.headerTitle}>Serviceability</Text>
          {tab === "areas" ? (
            <Pressable style={styles.addBtn} onPress={() => setEditing("new")} hitSlop={8}>
              <Ionicons name="add" size={22} color={colors.heading} />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.segment}>
          {(["areas", "zones"] as const).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={[styles.segBtn, tab === t && styles.segBtnActive]}>
              <Text style={[styles.segText, tab === t && styles.segTextActive]}>{t === "areas" ? "Areas (pincode)" : "Zones (map)"}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {tab === "areas" ? (
        areas.isLoading ? (
          <ListSkeleton rows={6} thumb={false} />
        ) : (
          <ScrollView
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={areas.isFetching} onRefresh={areas.refetch} tintColor={colors.green} colors={[colors.green]} />}
          >
            {(areas.data ?? []).map((a) => (
              <Pressable key={a.id} style={styles.row} onPress={() => setEditing(a)}>
                <View style={styles.pinBadge}><Text style={styles.pinText}>{a.pincode}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName} numberOfLines={1}>{a.area_name || "Unnamed area"}</Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {a.city || "—"}{a.delivery_eta_minutes ? ` · ~${a.delivery_eta_minutes} min` : ""}{a.has_geofence ? " · geofenced" : ""}
                  </Text>
                </View>
                <Switch value={a.is_active} onValueChange={() => { updateArea({ id: a.id, is_active: !a.is_active }); }} trackColor={{ true: colors.green }} thumbColor={colors.white} />
                <Pressable hitSlop={8} onPress={() => confirmDelete(a.pincode, () => deleteArea(a.id))} style={styles.del}>
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </Pressable>
              </Pressable>
            ))}
            {(areas.data ?? []).length === 0 ? <Text style={styles.emptySub}>No areas yet. Tap + to add a serviceable pincode.</Text> : null}
          </ScrollView>
        )
      ) : zones.isLoading ? (
        <ListSkeleton rows={5} thumb={false} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={zones.isFetching} onRefresh={zones.refetch} tintColor={colors.green} colors={[colors.green]} />}
        >
          <View style={styles.note}>
            <Ionicons name="information-circle-outline" size={16} color={colors.info} />
            <Text style={styles.noteText}>Zones are map-drawn in the web admin. Here you can toggle or remove them.</Text>
          </View>
          {(zones.data ?? []).map((z) => (
            <View key={z.id} style={styles.row}>
              <View style={styles.zoneIcon}><Ionicons name="map-outline" size={18} color={colors.green} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName} numberOfLines={1}>{z.name}</Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {[z.city, z.state].filter(Boolean).join(", ") || "—"} · {ringCount(z)} pts{z.delivery_eta_minutes ? ` · ~${z.delivery_eta_minutes} min` : ""} · P{z.priority}
                </Text>
              </View>
              <Switch value={z.is_active} onValueChange={() => { updateZone({ id: z.id, is_active: !z.is_active }); }} trackColor={{ true: colors.green }} thumbColor={colors.white} />
              <Pressable hitSlop={8} onPress={() => confirmDelete(z.name, () => deleteZone(z.id))} style={styles.del}>
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </Pressable>
            </View>
          ))}
          {(zones.data ?? []).length === 0 ? <Text style={styles.emptySub}>No delivery zones drawn yet.</Text> : null}
        </ScrollView>
      )}

      {editing ? <AreaSheet area={editing === "new" ? null : editing} onClose={() => setEditing(null)} /> : null}
    </Screen>
  );
}

function AreaSheet({ area, onClose }: { area: ServiceableArea | null; onClose: () => void }) {
  const toast = useToast();
  const [createArea, { isLoading: creating }] = useAdminCreateAreaMutation();
  const [updateArea, { isLoading: updating }] = useAdminUpdateAreaMutation();
  const [pincode, setPincode] = useState(area?.pincode ?? "");
  const [areaName, setAreaName] = useState(area?.area_name ?? "");
  const [city, setCity] = useState(area?.city ?? "");
  const [eta, setEta] = useState(area?.delivery_eta_minutes != null ? String(area.delivery_eta_minutes) : "");
  const [lat, setLat] = useState(area?.center_lat ?? "");
  const [lng, setLng] = useState(area?.center_lng ?? "");
  const [radius, setRadius] = useState(area?.radius_km ?? "");
  const [active, setActive] = useState(area?.is_active ?? true);
  const saving = creating || updating;

  async function save() {
    if (!pincode.trim()) return toast("Enter a pincode.", "info");
    const body: any = {
      pincode: pincode.trim(),
      area_name: areaName.trim(),
      city: city.trim(),
      delivery_eta_minutes: eta.trim() ? parseInt(eta, 10) : null,
      center_lat: lat.trim() || null,
      center_lng: lng.trim() || null,
      radius_km: radius.trim() || null,
      is_active: active,
    };
    try {
      if (area) await updateArea({ id: area.id, ...body }).unwrap();
      else await createArea(body).unwrap();
      toast(area ? "Area saved" : "Area added");
      onClose();
    } catch (e: any) {
      toast(e?.data?.pincode?.[0] || e?.data?.detail || "Couldn't save the area.", "error");
    }
  }

  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={sheet.backdrop} onPress={onClose} />
      <View style={[sheet.sheet, { maxHeight: "90%" }]}>
        <View style={sheet.handle} />
        <Text style={sheet.title}>{area ? "Edit area" : "New area"}</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Lbl t="Pincode *" />
          <TextInput style={sheet.input} value={pincode} onChangeText={setPincode} keyboardType="number-pad" placeholder="224001" placeholderTextColor={colors.muted} />
          <Lbl t="Area name" />
          <TextInput style={sheet.input} value={areaName} onChangeText={setAreaName} placeholder="Civil Lines" placeholderTextColor={colors.muted} />
          <View style={sheet.row}>
            <View style={{ flex: 1 }}><Lbl t="City" /><TextInput style={sheet.input} value={city} onChangeText={setCity} placeholder="Faizabad" placeholderTextColor={colors.muted} /></View>
            <View style={{ flex: 1 }}><Lbl t="ETA (min)" /><TextInput style={sheet.input} value={eta} onChangeText={setEta} keyboardType="number-pad" placeholder="20" placeholderTextColor={colors.muted} /></View>
          </View>
          <Lbl t="Geofence (optional) — center & radius" />
          <View style={sheet.row}>
            <View style={{ flex: 1 }}><TextInput style={sheet.input} value={lat} onChangeText={setLat} keyboardType="numbers-and-punctuation" placeholder="Lat" placeholderTextColor={colors.muted} /></View>
            <View style={{ flex: 1 }}><TextInput style={sheet.input} value={lng} onChangeText={setLng} keyboardType="numbers-and-punctuation" placeholder="Lng" placeholderTextColor={colors.muted} /></View>
            <View style={{ flex: 1 }}><TextInput style={sheet.input} value={radius} onChangeText={setRadius} keyboardType="decimal-pad" placeholder="Km" placeholderTextColor={colors.muted} /></View>
          </View>
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
  segText: { fontFamily: fonts.bold, fontSize: 13, color: "rgba(255,255,255,0.8)" },
  segTextActive: { color: colors.heading },

  list: { paddingHorizontal: spacing(2.5), paddingTop: spacing(2), paddingBottom: spacing(4) },
  row: { flexDirection: "row", alignItems: "center", gap: spacing(1.25), backgroundColor: colors.bg, borderRadius: 14, borderWidth: 1, borderColor: colors.lineSoft, padding: spacing(1.5), marginBottom: spacing(1.25), shadowColor: "#1c2b36", shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  pinBadge: { backgroundColor: colors.greenTint, borderRadius: 10, paddingVertical: spacing(0.75), paddingHorizontal: spacing(1.25), minWidth: 64, alignItems: "center" },
  pinText: { fontFamily: fonts.bold, fontSize: 13, color: colors.green },
  zoneIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.greenTint, alignItems: "center", justifyContent: "center" },
  rowName: { fontFamily: fonts.bold, fontSize: 14, color: colors.heading },
  rowMeta: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  del: { padding: 4 },
  note: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#e8f2fc", borderRadius: 12, padding: spacing(1.25), marginBottom: spacing(1.5) },
  noteText: { flex: 1, fontFamily: fontsAlt.regular, fontSize: 12, color: colors.info, lineHeight: 17 },
  emptySub: { fontFamily: fontsAlt.regular, fontSize: 13, color: colors.muted, textAlign: "center", marginTop: spacing(3) },
});

const sheet = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: spacing(2.5), paddingTop: spacing(1.25), paddingBottom: spacing(3) },
  handle: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: spacing(1.5) },
  title: { fontFamily: fonts.bold, fontSize: 18, color: colors.heading, marginBottom: spacing(0.5) },
  label: { fontFamily: fontsAlt.extrabold, fontSize: 11, letterSpacing: 0.8, color: colors.muted, marginTop: spacing(1.5), marginBottom: spacing(0.75) },
  input: { backgroundColor: colors.bgSoft, borderRadius: 12, borderWidth: 1, borderColor: colors.line, paddingHorizontal: spacing(1.75), paddingVertical: spacing(1.5), fontFamily: fonts.medium, fontSize: 15, color: colors.heading },
  row: { flexDirection: "row", gap: spacing(1.25) },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing(1.5) },
  switchLabel: { fontFamily: fonts.semibold, fontSize: 14, color: colors.heading },
  actions: { flexDirection: "row", gap: spacing(1.25), marginTop: spacing(1.5) },
  btn: { flex: 1, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  btnPrimary: { backgroundColor: colors.green },
  btnPrimaryText: { fontFamily: fonts.bold, fontSize: 15, color: colors.white },
  btnGhost: { backgroundColor: colors.bgSoft },
  btnGhostText: { fontFamily: fonts.bold, fontSize: 15, color: colors.heading },
});
