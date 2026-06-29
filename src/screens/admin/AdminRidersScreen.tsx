import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { Linking, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useAdminCreateRiderMutation, useAdminRidersQuery } from "../../api/baseApi";
import { Screen } from "../../components/Screen";
import { ListSkeleton } from "../../components/Skeleton";
import { useToast } from "../../components/Toast";
import { colors, fonts, fontsAlt, spacing } from "../../theme";

export default function AdminRidersScreen() {
  const navigation = useNavigation();
  const [adding, setAdding] = useState(false);
  const { data: riders, isLoading, isFetching, refetch } = useAdminRidersQuery();

  const onDuty = (riders ?? []).filter((r) => r.is_on_duty).length;

  return (
    <Screen padded={false}>
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
          <Pressable style={styles.addBtn} onPress={() => setAdding(true)} hitSlop={8}>
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
              <View key={r.id} style={styles.row}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(r.name?.trim()?.[0] || "R").toUpperCase()}</Text>
                  <View style={[styles.dutyDot, { backgroundColor: r.is_on_duty ? colors.green : colors.muted }]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>{r.name?.trim() || "Rider"}</Text>
                  <Text style={styles.meta} numberOfLines={1}>
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
                    {!r.is_active ? <Text style={styles.inactive}>inactive</Text> : null}
                  </View>
                </View>
                <Pressable style={styles.callBtn} onPress={() => Linking.openURL(`tel:${r.phone}`)} hitSlop={8}>
                  <Ionicons name="call-outline" size={18} color={colors.green} />
                </Pressable>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {adding ? <AddRiderSheet onClose={() => setAdding(false)} /> : null}
    </Screen>
  );
}

function AddRiderSheet({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [createRider, { isLoading }] = useAdminCreateRiderMutation();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [email, setEmail] = useState("");

  async function save() {
    if (!phone.trim()) return toast("A phone number is required.", "info");
    try {
      await createRider({
        phone: phone.trim(),
        name: name.trim(),
        vehicle_number: vehicle.trim(),
        email: email.trim(),
      }).unwrap();
      toast("Rider onboarded.");
      onClose();
    } catch (e: any) {
      toast(e?.data?.error || "Couldn't add the rider.", "error");
    }
  }

  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={sheet.backdrop} onPress={onClose} />
      <View style={sheet.sheet}>
        <View style={sheet.handle} />
        <Text style={sheet.title}>Onboard a rider</Text>
        <Text style={sheet.label}>Mobile number *</Text>
        <TextInput style={sheet.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+91…" placeholderTextColor={colors.muted} />
        <Text style={sheet.label}>Name</Text>
        <TextInput style={sheet.input} value={name} onChangeText={setName} placeholder="Full name" placeholderTextColor={colors.muted} />
        <Text style={sheet.label}>Vehicle number</Text>
        <TextInput style={sheet.input} value={vehicle} onChangeText={setVehicle} autoCapitalize="characters" placeholder="UP32 AB 1234" placeholderTextColor={colors.muted} />
        <Text style={sheet.label}>Email</Text>
        <TextInput style={sheet.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" placeholderTextColor={colors.muted} />
        <View style={sheet.actions}>
          <Pressable style={[sheet.btn, sheet.btnGhost]} onPress={onClose}><Text style={sheet.btnGhostText}>Cancel</Text></Pressable>
          <Pressable style={[sheet.btn, sheet.btnPrimary, isLoading && { opacity: 0.7 }]} onPress={save} disabled={isLoading}>
            <Text style={sheet.btnPrimaryText}>{isLoading ? "Adding…" : "Add rider"}</Text>
          </Pressable>
        </View>
      </View>
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
  row: { flexDirection: "row", alignItems: "center", gap: spacing(1.5), backgroundColor: colors.bg, borderRadius: 16, borderWidth: 1, borderColor: colors.lineSoft, padding: spacing(1.75), marginBottom: spacing(1.25) },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.heading, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: fonts.bold, fontSize: 18, color: colors.white },
  dutyDot: { position: "absolute", right: -1, bottom: -1, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: colors.bg },
  name: { fontFamily: fonts.bold, fontSize: 15, color: colors.heading },
  meta: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  tagRow: { flexDirection: "row", alignItems: "center", gap: spacing(0.75), marginTop: spacing(1) },
  tag: { borderRadius: 7, paddingVertical: 3, paddingHorizontal: 8 },
  tagOn: { backgroundColor: colors.greenTint },
  tagOff: { backgroundColor: colors.bgSoft },
  tagText: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 0.4 },
  tagTextOn: { color: colors.green },
  tagTextOff: { color: colors.muted },
  loadTag: { backgroundColor: "#e8f2fc", borderRadius: 7, paddingVertical: 3, paddingHorizontal: 8 },
  loadText: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 0.4, color: colors.info },
  inactive: { fontFamily: fontsAlt.regular, fontSize: 11, color: colors.error },
  callBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.greenTint, alignItems: "center", justifyContent: "center" },

  empty: { alignItems: "center", paddingTop: spacing(6) },
  emptyBadge: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.greenTint, alignItems: "center", justifyContent: "center", marginBottom: spacing(2) },
  emptyTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.heading },
  emptySub: { fontFamily: fontsAlt.regular, fontSize: 13, color: colors.muted, marginTop: 4, textAlign: "center", paddingHorizontal: spacing(4) },
});

const sheet = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: spacing(2.5), paddingTop: spacing(1.25), paddingBottom: spacing(3) },
  handle: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: spacing(1.5) },
  title: { fontFamily: fonts.bold, fontSize: 18, color: colors.heading },
  label: { fontFamily: fontsAlt.extrabold, fontSize: 11, letterSpacing: 0.8, color: colors.muted, marginTop: spacing(1.5), marginBottom: spacing(0.75) },
  input: { backgroundColor: colors.bgSoft, borderRadius: 12, borderWidth: 1, borderColor: colors.line, paddingHorizontal: spacing(1.75), paddingVertical: spacing(1.5), fontFamily: fonts.medium, fontSize: 15, color: colors.heading },
  actions: { flexDirection: "row", gap: spacing(1.25), marginTop: spacing(2.5) },
  btn: { flex: 1, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  btnPrimary: { backgroundColor: colors.green },
  btnPrimaryText: { fontFamily: fonts.bold, fontSize: 15, color: colors.white },
  btnGhost: { backgroundColor: colors.bgSoft },
  btnGhostText: { fontFamily: fonts.bold, fontSize: 15, color: colors.heading },
});
