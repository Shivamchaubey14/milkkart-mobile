import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  Address,
  useAddressesQuery,
  useDeleteAddressMutation,
  useUpdateMeMutation,
} from "../api/baseApi";
import { Screen } from "../components/Screen";
import { useToast } from "../components/Toast";
import type { ProfileStackParamList } from "../navigation/ProfileStack";
import { setUser } from "../store/authSlice";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { colors, fonts, fontsAlt, spacing } from "../theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const labelIcon = (label: string): IoniconName => {
  const l = (label || "").toLowerCase();
  if (l === "work") return "briefcase-outline";
  if (l === "other") return "location-outline";
  return "home-outline";
};

function formatAddress(a: Address): string {
  return [a.address_line, a.landmark, a.city, `${a.state} ${a.pincode}`.trim()]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(", ");
}

function DetailRow({
  icon,
  label,
  value,
  right,
  link,
}: {
  icon: IoniconName;
  label: string;
  value: string;
  right?: React.ReactNode;
  link?: boolean;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <Ionicons name={icon} size={18} color={colors.green} />
      </View>
      <View style={styles.detailText}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={[styles.detailValue, link && styles.detailLink]} numberOfLines={1}>
          {value}
        </Text>
      </View>
      {right}
    </View>
  );
}

export default function AccountScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { data: addresses, isLoading, isFetching, refetch } = useAddressesQuery();
  const [updateMe, { isLoading: saving }] = useUpdateMeMutation();
  const [deleteAddress] = useDeleteAddressMutation();

  function confirmDelete(a: Address) {
    const name = a.label ? a.label[0].toUpperCase() + a.label.slice(1) : "this address";
    Alert.alert("Delete address", `Remove "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteAddress(a.id).unwrap();
            toast("Address deleted.");
          } catch {
            toast("Couldn't delete the address. Please try again.", "error");
          }
        },
      },
    ]);
  }

  // Inline edit of personal details.
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  function startEdit() {
    setName(user?.name || "");
    setEmail(user?.email || "");
    setEditing(true);
  }

  async function saveDetails() {
    try {
      const updated = await updateMe({ name: name.trim(), email: email.trim() }).unwrap();
      dispatch(setUser(updated));
      setEditing(false);
      toast("Profile updated.");
    } catch {
      toast("Couldn't update profile. Please try again.", "error");
    }
  }

  return (
    <Screen padded={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.green} colors={[colors.green]} />
        }
      >
        {/* Header — matches the Profile screen's dark card. */}
        <View style={styles.header}>
          <View style={styles.blob} />
          <Text style={styles.headerTitle}>My Account</Text>
          <Text style={styles.headerSub}>Manage your details & addresses</Text>
        </View>

        <View style={styles.body}>
          {/* Personal details */}
          <View style={styles.sectionHead}>
            <Text style={styles.sectionLabel}>PERSONAL DETAILS</Text>
            {!editing ? (
              <Pressable style={styles.editPillHeader} hitSlop={8} onPress={startEdit}>
                <Ionicons name="pencil" size={13} color={colors.green} />
                <Text style={styles.editPillText}>Edit</Text>
              </Pressable>
            ) : null}
          </View>
          <View style={styles.card}>
            {editing ? (
              <>
                <Text style={styles.editLabel}>Name</Text>
                <TextInput
                  style={styles.editInput}
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor={colors.muted}
                />

                <Text style={styles.editLabel}>Mobile Number</Text>
                <View style={styles.readonlyRow}>
                  <Text style={styles.readonlyText}>{user?.phone || "—"}</Text>
                  <View style={styles.verified}>
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                </View>

                <Text style={styles.editLabel}>Email</Text>
                <TextInput
                  style={styles.editInput}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <View style={styles.editActions}>
                  <Pressable style={styles.cancelPill} onPress={() => setEditing(false)} disabled={saving}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={styles.savePill} onPress={saveDetails} disabled={saving}>
                    {saving ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <Text style={styles.saveText}>Save</Text>
                    )}
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <DetailRow icon="person-outline" label="Name" value={user?.name || "—"} />
                <View style={styles.hr} />
                <DetailRow
                  icon="call-outline"
                  label="Mobile Number"
                  value={user?.phone || "—"}
                  right={
                    <View style={styles.verified}>
                      <Text style={styles.verifiedText}>Verified</Text>
                    </View>
                  }
                />
                <View style={styles.hr} />
                <DetailRow icon="mail-outline" label="Email" value={user?.email || "Add email"} link />
              </>
            )}
          </View>

          {/* Saved addresses */}
          <Text style={[styles.sectionLabel, styles.addrHead]}>SAVED ADDRESSES</Text>

          {isLoading ? (
            <ActivityIndicator color={colors.green} style={{ marginTop: spacing(2) }} />
          ) : (
            (addresses ?? []).map((a) => (
              <View key={a.id} style={styles.addrCard}>
                <View style={styles.addrTop}>
                  <View style={styles.addrIcon}>
                    <Ionicons name={labelIcon(a.label)} size={18} color={colors.heading} />
                  </View>
                  <Text style={styles.addrLabel}>
                    {a.label ? a.label[0].toUpperCase() + a.label.slice(1) : "Address"}
                  </Text>
                  {a.is_default ? (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultText}>DEFAULT</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.addrText}>{formatAddress(a)}</Text>
                <View style={styles.addrHr} />
                <View style={styles.addrActions}>
                  <Pressable
                    style={styles.editPill}
                    hitSlop={6}
                    onPress={() => navigation.navigate("AddAddress", { address: a })}
                  >
                    <Ionicons name="pencil-outline" size={15} color={colors.green} />
                    <Text style={styles.actionGreen}>Edit</Text>
                  </Pressable>
                  <Pressable style={styles.deletePill} hitSlop={6} onPress={() => confirmDelete(a)}>
                    <Ionicons name="trash-outline" size={15} color={colors.white} />
                    <Text style={styles.actionRed}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}

          <Pressable style={styles.addBtn} onPress={() => navigation.navigate("AddAddress")}>
            <Ionicons name="add" size={18} color={colors.green} />
            <Text style={styles.addText}>Add Address</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing(4) },

  // Header
  // Same dimensions as the Profile screen's header card.
  header: {
    backgroundColor: colors.heading,
    borderRadius: 26,
    marginHorizontal: spacing(2.5),
    marginTop: spacing(1),
    paddingHorizontal: spacing(2.5),
    paddingTop: spacing(2.5),
    paddingBottom: spacing(3),
    minHeight: 150,
    justifyContent: "center",
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
  headerTitle: { fontFamily: fonts.bold, fontSize: 24, color: colors.white },
  headerSub: { fontFamily: fontsAlt.regular, fontSize: 13, color: colors.green, marginTop: 3 },

  body: { paddingHorizontal: spacing(2.5), paddingTop: spacing(2) },

  // Section headers
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionLabel: { fontFamily: fontsAlt.extrabold, fontSize: 12, letterSpacing: 1, color: colors.muted },
  // Pill "Edit" button with pencil icon for Personal Details.
  editPillHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.greenTint,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  editPillText: { fontFamily: fonts.bold, fontSize: 13, color: colors.green },
  addrHead: { marginTop: spacing(3) },

  // Inline edit form (Personal Details)
  editLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.green,
    marginTop: spacing(1.25),
    marginBottom: 6,
  },
  editInput: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1.25),
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.heading,
  },
  readonlyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.bgSoft,
    borderRadius: 12,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1.25),
  },
  readonlyText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.heading },
  editActions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing(1.25), marginTop: spacing(2) },
  cancelPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg,
    paddingVertical: 9,
    paddingHorizontal: 20,
  },
  cancelText: { fontFamily: fonts.bold, fontSize: 14, color: colors.heading },
  savePill: {
    borderRadius: 999,
    backgroundColor: colors.green,
    paddingVertical: 9,
    paddingHorizontal: 24,
    minWidth: 84,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { fontFamily: fonts.bold, fontSize: 14, color: colors.white },

  // Cards
  card: {
    backgroundColor: colors.bg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    padding: spacing(1.75),
    marginTop: spacing(1.5),
  },
  hr: { height: 1, backgroundColor: colors.lineSoft, marginVertical: spacing(1.25) },

  // Detail rows
  detailRow: { flexDirection: "row", alignItems: "center" },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.greenTint,
    alignItems: "center",
    justifyContent: "center",
  },
  detailText: { flex: 1, marginLeft: spacing(1.5) },
  detailLabel: { fontFamily: fonts.semibold, fontSize: 12, color: colors.green },
  detailValue: { fontFamily: fonts.bold, fontSize: 15, color: colors.heading, marginTop: 2 },
  detailLink: { color: colors.info, textDecorationLine: "underline" },
  verified: {
    backgroundColor: colors.greenTint,
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  verifiedText: { fontFamily: fonts.bold, fontSize: 11, color: colors.green },

  // Address — neutral surface (like Bill Details) with a hairline border like
  // the Personal Details card. Uses `line` (not lineSoft) so the border stays
  // visible against the grey bgSoft fill.
  addrCard: {
    backgroundColor: colors.bgSoft,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(1.75),
    marginTop: spacing(1.5),
  },
  addrTop: { flexDirection: "row", alignItems: "center" },
  addrIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  addrLabel: { fontFamily: fonts.bold, fontSize: 15, color: colors.heading, marginLeft: spacing(1.5) },
  defaultBadge: {
    backgroundColor: colors.white,
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 7,
    marginLeft: spacing(1),
  },
  defaultText: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.5, color: colors.green },
  addrText: {
    fontFamily: fontsAlt.regular,
    fontSize: 13,
    color: colors.heading,
    lineHeight: 19,
    marginTop: spacing(1.25),
  },
  addrHr: { height: 1, backgroundColor: "rgba(37,61,78,0.14)", marginVertical: spacing(1.25) },
  addrActions: { flexDirection: "row", gap: spacing(1.5) },
  // Pill-shaped action buttons on the yellow card.
  editPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  deletePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.error,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  actionGreen: { fontFamily: fonts.bold, fontSize: 14, color: colors.green },
  actionRed: { fontFamily: fonts.bold, fontSize: 14, color: colors.white },

  // Add address
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.green,
    borderStyle: "dashed",
    borderRadius: 14,
    paddingVertical: spacing(1.75),
    marginTop: spacing(2),
  },
  addText: { fontFamily: fonts.bold, fontSize: 15, color: colors.green },
});
