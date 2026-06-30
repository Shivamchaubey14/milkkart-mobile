import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { KeyboardAvoidingView, Linking, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { AdminRider, useAdminCreateRiderMutation, useAdminRidersQuery, useAdminUpdateRiderMutation } from "../../api/baseApi";
import { Screen } from "../../components/Screen";
import { ListSkeleton } from "../../components/Skeleton";
import { useToast } from "../../components/Toast";
import { colors, fonts, fontsAlt, spacing } from "../../theme";

export default function AdminRidersScreen() {
  const navigation = useNavigation();
  const [editing, setEditing] = useState<AdminRider | "new" | null>(null);
  const { data: riders, isLoading, isFetching, refetch } = useAdminRidersQuery();

  const onDuty = (riders ?? []).filter((r) => r.is_on_duty).length;

  return (
    <Screen padded={false} style={{ backgroundColor: colors.bgSoft }}>
      <View style={styles.header}>
        <View style={styles.blob} />
        <View style={styles.headerRow}>
          <Pressable style={styles.back} onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="arrow-back" size={20} color={colors.white} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Riders</Text>
            {riders ? (
              <Text style={styles.headerSub}>{riders.length} total · {onDuty} on duty</Text>
            ) : null}
          </View>
          <Pressable style={styles.addBtn} onPress={() => setEditing("new")} hitSlop={8}>
            <Ionicons name="add" size={22} color={colors.heading} />
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <ListSkeleton rows={6} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.green} colors={[colors.green]} />}
        >
          {(riders ?? []).length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyBadge}><Ionicons name="bicycle-outline" size={30} color={colors.green} /></View>
              <Text style={styles.emptyTitle}>No riders yet</Text>
              <Text style={styles.emptySub}>Tap + to onboard your first delivery partner.</Text>
            </View>
          ) : (
            riders!.map((r) => (
              <Pressable key={r.id} style={({ pressed }) => [styles.row, pressed && { opacity: 0.9 }]} onPress={() => setEditing(r)}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(r.name?.trim()?.[0] || "R").toUpperCase()}</Text>
                  <View style={[styles.dutyDot, { backgroundColor: r.is_on_duty ? colors.green : colors.muted }]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{r.name?.trim() || "Rider"}</Text>
                  <Text style={styles.meta}>
                    {r.phone}{r.vehicle_number ? ` · ${r.vehicle_number}` : ""}
                  </Text>
                  <View style={styles.tagRow}>
                    <View style={[styles.tag, r.is_on_duty ? styles.tagOn : styles.tagOff]}>
                      <Text style={[styles.tagText, r.is_on_duty ? styles.tagTextOn : styles.tagTextOff]}>
                        {r.is_on_duty ? "ON DUTY" : "OFF DUTY"}
                      </Text>
                    </View>
                    <View style={styles.loadTag}>
                      <Text style={styles.loadText}>{r.load} active</Text>
                    </View>
                    {!r.is_active ? <View style={styles.inactiveTag}><Text style={styles.inactiveText}>INACTIVE</Text></View> : null}
                  </View>
                </View>
                <Pressable style={styles.callBtn} onPress={() => Linking.openURL(`tel:${r.phone}`)} hitSlop={8}>
                  <Ionicons name="call-outline" size={18} color={colors.green} />
                </Pressable>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}

      {editing ? <RiderSheet rider={editing === "new" ? null : editing} onClose={() => setEditing(null)} /> : null}
    </Screen>
  );
}

function RiderSheet({ rider, onClose }: { rider: AdminRider | null; onClose: () => void }) {
  const toast = useToast();
  const [createRider, { isLoading: creating }] = useAdminCreateRiderMutation();
  const [updateRider, { isLoading: updating }] = useAdminUpdateRiderMutation();
  const [phone, setPhone] = useState(rider?.phone ?? "");
  const [name, setName] = useState(rider?.name ?? "");
  const [vehicle, setVehicle] = useState(rider?.vehicle_number ?? "");
  const [email, setEmail] = useState(rider?.email ?? "");
  const [active, setActive] = useState(rider?.is_active ?? true);
  const saving = creating || updating;

  async function save() {
    if (!rider && !phone.trim()) return toast("A phone number is required.", "info");
    try {
      if (rider) {
        await updateRider({ id: rider.id, name: name.trim(), vehicle_number: vehicle.trim(), email: email.trim(), is_active: active }).unwrap();
        toast("Rider updated.");
      } else {
        await createRider({ phone: phone.trim(), name: name.trim(), vehicle_number: vehicle.trim(), email: email.trim() }).unwrap();
        toast("Rider onboarded.");
      }
      onClose();
    } catch (e: any) {
      toast(e?.data?.error || "Couldn't save the rider.", "error");
    }
  }

  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={sheet.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Pressable style={sheet.backdrop} onPress={onClose} />
        <View style={sheet.sheet}>
        <View style={sheet.handle} />
        <Text style={sheet.title}>{rider ? "Edit rider" : "Onboard a rider"}</Text>
        <Text style={sheet.label}>Mobile number{rider ? "" : " *"}</Text>
        <TextInput
          style={[sheet.input, rider && sheet.inputDisabled]}
          value={phone}
          onChangeText={setPhone}
          editable={!rider}
          keyboardType="phone-pad"
          placeholder="+91…"
          placeholderTextColor={colors.muted}
        />
        <Text style={sheet.label}>Name</Text>
        <TextInput style={sheet.input} value={name} onChangeText={setName} placeholder="Full name" placeholderTextColor={colors.muted} />
        <Text style={sheet.label}>Vehicle number</Text>
        <TextInput style={sheet.input} value={vehicle} onChangeText={setVehicle} autoCapitalize="characters" placeholder="UP32 AB 1234" placeholderTextColor={colors.muted} />
        <Text style={sheet.label}>Email</Text>
        <TextInput style={sheet.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" placeholderTextColor={colors.muted} />
        {rider ? (
          <View style={sheet.switchRow}>
            <Text style={sheet.switchLabel}>Active</Text>
            <Switch value={active} onValueChange={setActive} trackColor={{ true: colors.green }} thumbColor={colors.white} />
          </View>
        ) : null}
        <View style={sheet.actions}>
          <Pressable style={[sheet.btn, sheet.btnGhost]} onPress={onClose}><Text style={sheet.btnGhostText}>Cancel</Text></Pressable>
          <Pressable style={[sheet.btn, sheet.btnPrimary, saving && { opacity: 0.7 }]} onPress={save} disabled={saving}>
            <Text style={sheet.btnPrimaryText}>{saving ? "Saving…" : rider ? "Save changes" : "Add rider"}</Text>
          </Pressable>
        </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.heading, borderRadius: 26, marginHorizontal: spacing(2.5), marginTop: spacing(1),
    paddingHorizontal: spacing(2.5), paddingTop: spacing(2.5), paddingBottom: spacing(2.5), overflow: "hidden",
  },
  blob: { position: "absolute", top: -45, right: -30, width: 150, height: 150, borderRadius: 75, backgroundColor: "rgba(255,255,255,0.06)" },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing(1.5) },
  back: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: fonts.bold, fontSize: 22, color: colors.white },
  headerSub: { fontFamily: fontsAlt.regular, fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  addBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },

  list: { paddingHorizontal: spacing(2.5), paddingTop: spacing(2), paddingBottom: spacing(4) },
  row: { flexDirection: "row", alignItems: "center", gap: spacing(1.5), backgroundColor: colors.bg, borderRadius: 16, borderWidth: 1, borderColor: colors.lineSoft, padding: spacing(1.75), marginBottom: spacing(1.25), shadowColor: "#1c2b36", shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.heading, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: fonts.bold, fontSize: 18, color: colors.white },
  dutyDot: { position: "absolute", right: -1, bottom: -1, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: colors.bg },
  name: { fontFamily: fonts.bold, fontSize: 15, color: colors.heading },
  meta: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginTop: 2, lineHeight: 17 },
  tagRow: { flexDirection: "row", alignItems: "center", gap: spacing(0.75), marginTop: spacing(1) },
  tag: { borderRadius: 7, paddingVertical: 3, paddingHorizontal: 8 },
  tagOn: { backgroundColor: colors.greenTint },
  tagOff: { backgroundColor: colors.bgSoft },
  tagText: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 0.4 },
  tagTextOn: { color: colors.green },
  tagTextOff: { color: colors.muted },
  loadTag: { backgroundColor: "#e8f2fc", borderRadius: 7, paddingVertical: 3, paddingHorizontal: 8 },
  loadText: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 0.4, color: colors.info },
  inactiveTag: { backgroundColor: colors.errorTint, borderRadius: 7, paddingVertical: 3, paddingHorizontal: 8 },
  inactiveText: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 0.4, color: colors.error },
  callBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.greenTint, alignItems: "center", justifyContent: "center" },

  empty: { alignItems: "center", paddingTop: spacing(6) },
  emptyBadge: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.greenTint, alignItems: "center", justifyContent: "center", marginBottom: spacing(2) },
  emptyTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.heading },
  emptySub: { fontFamily: fontsAlt.regular, fontSize: 13, color: colors.muted, marginTop: 4, textAlign: "center", paddingHorizontal: spacing(4) },
});

const sheet = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: spacing(2.5), paddingTop: spacing(1.25), paddingBottom: spacing(3) },
  handle: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: spacing(1.5) },
  title: { fontFamily: fonts.bold, fontSize: 18, color: colors.heading },
  label: { fontFamily: fontsAlt.extrabold, fontSize: 11, letterSpacing: 0.8, color: colors.muted, marginTop: spacing(1.5), marginBottom: spacing(0.75) },
  input: { backgroundColor: colors.bgSoft, borderRadius: 12, borderWidth: 1, borderColor: colors.line, paddingHorizontal: spacing(1.75), paddingVertical: spacing(1.5), fontFamily: fonts.medium, fontSize: 15, color: colors.heading },
  inputDisabled: { color: colors.muted, backgroundColor: colors.lineSoft },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing(1.25), marginTop: spacing(0.5) },
  switchLabel: { fontFamily: fonts.semibold, fontSize: 14, color: colors.heading },
  actions: { flexDirection: "row", gap: spacing(1.25), marginTop: spacing(2) },
  btn: { flex: 1, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  btnPrimary: { backgroundColor: colors.green },
  btnPrimaryText: { fontFamily: fonts.bold, fontSize: 15, color: colors.white },
  btnGhost: { backgroundColor: colors.bgSoft },
  btnGhostText: { fontFamily: fonts.bold, fontSize: 15, color: colors.heading },
});
