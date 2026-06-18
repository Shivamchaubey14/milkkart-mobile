import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Address, useAddressesQuery } from "../api/baseApi";
import { Screen } from "../components/Screen";
import { useToast } from "../components/Toast";
import { useAppSelector } from "../store/hooks";
import { colors, fonts, fontsAlt, spacing } from "../theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

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
  const navigation = useNavigation();
  const user = useAppSelector((s) => s.auth.user);
  const toast = useToast();
  const { data: addresses, isLoading } = useAddressesQuery();

  const soon = (what: string) => () => toast(`${what} — coming soon.`);

  return (
    <Screen padded={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.blob} />
          <Pressable style={styles.back} hitSlop={8} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={colors.white} />
          </Pressable>
          <Text style={styles.headerTitle}>My Account</Text>
          <Text style={styles.headerSub}>Manage your details & addresses</Text>
        </View>

        <View style={styles.body}>
          {/* Personal details */}
          <View style={styles.sectionHead}>
            <Text style={styles.sectionLabel}>PERSONAL DETAILS</Text>
            <Pressable hitSlop={8} onPress={soon("Edit details")}>
              <Text style={styles.editLink}>Edit</Text>
            </Pressable>
          </View>
          <View style={styles.card}>
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
          </View>

          {/* Saved addresses */}
          <Text style={[styles.sectionLabel, styles.addrHead]}>SAVED ADDRESSES</Text>

          {isLoading ? (
            <ActivityIndicator color={colors.green} style={{ marginTop: spacing(2) }} />
          ) : (
            (addresses ?? []).map((a) => (
              <View key={a.id} style={styles.card}>
                <View style={styles.addrTop}>
                  <View style={styles.detailIcon}>
                    <Ionicons name="home-outline" size={18} color={colors.green} />
                  </View>
                  <Text style={styles.addrLabel}>{a.label || "Address"}</Text>
                  {a.is_default ? (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultText}>DEFAULT</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.addrText}>{formatAddress(a)}</Text>
                <View style={styles.hr} />
                <View style={styles.addrActions}>
                  <Pressable style={styles.action} hitSlop={6} onPress={soon("Edit address")}>
                    <Ionicons name="pencil-outline" size={15} color={colors.green} />
                    <Text style={styles.actionGreen}>Edit</Text>
                  </Pressable>
                  <Pressable style={styles.action} hitSlop={6} onPress={soon("Delete address")}>
                    <Ionicons name="trash-outline" size={15} color={colors.error} />
                    <Text style={styles.actionRed}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}

          <Pressable style={styles.addBtn} onPress={soon("Add address")}>
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
  header: {
    backgroundColor: colors.heading,
    borderRadius: 26,
    marginHorizontal: spacing(2.5),
    marginTop: spacing(1),
    paddingHorizontal: spacing(2.5),
    paddingTop: spacing(2),
    paddingBottom: spacing(3),
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
  back: { marginLeft: -spacing(0.5), marginBottom: spacing(1), alignSelf: "flex-start" },
  headerTitle: { fontFamily: fonts.bold, fontSize: 24, color: colors.white },
  headerSub: { fontFamily: fontsAlt.regular, fontSize: 13, color: colors.green, marginTop: 3 },

  body: { paddingHorizontal: spacing(2.5), paddingTop: spacing(2) },

  // Section headers
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionLabel: { fontFamily: fontsAlt.extrabold, fontSize: 12, letterSpacing: 1, color: colors.muted },
  editLink: { fontFamily: fonts.bold, fontSize: 14, color: colors.green },
  addrHead: { marginTop: spacing(3) },

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

  // Address
  addrTop: { flexDirection: "row", alignItems: "center" },
  addrLabel: { fontFamily: fonts.bold, fontSize: 15, color: colors.heading, marginLeft: spacing(1.5) },
  defaultBadge: {
    backgroundColor: colors.greenTint,
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 7,
    marginLeft: spacing(1),
  },
  defaultText: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.5, color: colors.green },
  addrText: {
    fontFamily: fontsAlt.regular,
    fontSize: 13,
    color: colors.text,
    lineHeight: 19,
    marginTop: spacing(1.25),
  },
  addrActions: { flexDirection: "row", gap: spacing(3) },
  action: { flexDirection: "row", alignItems: "center", gap: 5 },
  actionGreen: { fontFamily: fonts.bold, fontSize: 14, color: colors.green },
  actionRed: { fontFamily: fonts.bold, fontSize: 14, color: colors.error },

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
