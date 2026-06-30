import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAdminCreateImportMutation, useAdminImportDetailQuery, useAdminImportsQuery } from "../../api/baseApi";
import { Screen } from "../../components/Screen";
import { useToast } from "../../components/Toast";
import { colors, fonts, fontsAlt, spacing } from "../../theme";

type PickedFile = { uri: string; name: string; mimeType?: string };

const KINDS: { key: string; label: string; columns: string }[] = [
  { key: "customers", label: "Customers", columns: "phone, name, email, address" },
  { key: "riders", label: "Riders", columns: "phone, name, vehicle_number, email" },
  { key: "inventory", label: "Inventory", columns: "sku, stock (or delta), note" },
];

const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  pending: { label: "PENDING", bg: "#fff4d6", fg: "#b98421" },
  processing: { label: "PROCESSING", bg: "#e8f2fc", fg: colors.info },
  completed: { label: "COMPLETED", bg: colors.greenTint, fg: colors.green },
  failed: { label: "FAILED", bg: colors.errorTint, fg: colors.error },
};
const fmtDate = (iso: string) => new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export default function AdminBulkImportScreen() {
  const navigation = useNavigation();
  const toast = useToast();
  const [kind, setKind] = useState("customers");
  const [file, setFile] = useState<PickedFile | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);

  const imports = useAdminImportsQuery();
  const [createImport, { isLoading: uploading }] = useAdminCreateImportMutation();

  // Poll the active job until it finishes.
  const job = useAdminImportDetailQuery(activeId as number, {
    skip: !activeId,
    pollingInterval: activeId ? 1500 : 0,
  });
  const done = job.data && (job.data.status === "completed" || job.data.status === "failed");
  useEffect(() => {
    if (done) imports.refetch();
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  async function pick() {
    const res = await DocumentPicker.getDocumentAsync({
      type: [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "text/csv",
        "text/comma-separated-values",
      ],
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    setFile({ uri: a.uri, name: a.name, mimeType: a.mimeType });
  }

  async function upload() {
    if (!file) return toast("Choose a .xlsx or .csv file first.", "info");
    try {
      const created = await createImport({ kind, file }).unwrap();
      setActiveId(created.id);
      setFile(null);
      toast("Uploaded — processing…");
    } catch (e: any) {
      toast(e?.data?.error || "Upload failed. Check the file and try again.", "error");
    }
  }

  const active = job.data;

  return (
    <Screen padded={false} style={{ backgroundColor: colors.bgSoft }}>
      <View style={styles.header}>
        <View style={styles.blob} />
        <View style={styles.headerRow}>
          <Pressable style={styles.back} onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="arrow-back" size={20} color={colors.white} />
          </Pressable>
          <Text style={styles.headerTitle}>Bulk Import</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={imports.isFetching} onRefresh={imports.refetch} tintColor={colors.green} colors={[colors.green]} />}
      >
        {/* Kind */}
        <Text style={styles.section}>IMPORT TYPE</Text>
        <View style={styles.kindRow}>
          {KINDS.map((k) => (
            <Pressable key={k.key} onPress={() => setKind(k.key)} style={[styles.kindChip, kind === k.key && styles.kindChipActive]}>
              <Text style={[styles.kindText, kind === k.key && styles.kindTextActive]}>{k.label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.columns}>Columns: {KINDS.find((k) => k.key === kind)!.columns}</Text>

        {/* Picker + upload */}
        <Pressable style={styles.pickBox} onPress={pick}>
          <Ionicons name={file ? "document-text" : "cloud-upload-outline"} size={26} color={colors.green} />
          <Text style={styles.pickText} numberOfLines={1}>{file ? file.name : "Choose a .xlsx or .csv file"}</Text>
          {file ? <Text style={styles.pickHint}>Tap to choose a different file</Text> : <Text style={styles.pickHint}>Max 5 MB</Text>}
        </Pressable>
        <Pressable style={[styles.uploadBtn, (!file || uploading) && { opacity: 0.6 }]} onPress={upload} disabled={!file || uploading}>
          <Text style={styles.uploadText}>{uploading ? "Uploading…" : "Upload & import"}</Text>
        </Pressable>

        {/* Active job progress */}
        {active ? (
          <View style={styles.jobCard}>
            <View style={styles.jobTop}>
              <Text style={styles.jobName} numberOfLines={1}>{active.filename || active.kind}</Text>
              <View style={[styles.pill, { backgroundColor: (STATUS[active.status] ?? STATUS.pending).bg }]}>
                <Text style={[styles.pillText, { color: (STATUS[active.status] ?? STATUS.pending).fg }]}>{(STATUS[active.status] ?? STATUS.pending).label}</Text>
              </View>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${active.progress_percent}%` }]} />
            </View>
            <Text style={styles.jobMeta}>
              {active.processed_rows}/{active.total_rows} rows · {active.success_count} ok · {active.error_count} errors
            </Text>
            {active.message ? <Text style={styles.jobError}>{active.message}</Text> : null}
            {active.errors?.length ? (
              <View style={styles.errBox}>
                {active.errors.slice(0, 20).map((er, i) => (
                  <Text key={i} style={styles.errRow}>Row {er.row}: {er.message}</Text>
                ))}
                {active.errors.length > 20 ? <Text style={styles.errMore}>+{active.errors.length - 20} more…</Text> : null}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Recent imports */}
        <Text style={styles.section}>RECENT IMPORTS</Text>
        {(imports.data ?? []).length === 0 ? (
          <Text style={styles.empty}>No imports yet.</Text>
        ) : (
          (imports.data ?? []).map((j) => {
            const s = STATUS[j.status] ?? STATUS.pending;
            return (
              <Pressable key={j.id} style={styles.recentRow} onPress={() => setActiveId(j.id)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recentName} numberOfLines={1}>{j.filename || j.kind}</Text>
                  <Text style={styles.recentMeta}>{j.kind} · {j.success_count} ok · {j.error_count} err · {fmtDate(j.created_at)}</Text>
                </View>
                <View style={[styles.pill, { backgroundColor: s.bg }]}><Text style={[styles.pillText, { color: s.fg }]}>{s.label}</Text></View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </Screen>
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

  body: { paddingHorizontal: spacing(2.5), paddingTop: spacing(2), paddingBottom: spacing(5) },
  section: { fontFamily: fontsAlt.extrabold, fontSize: 11, letterSpacing: 0.8, color: colors.muted, marginTop: spacing(2.5), marginBottom: spacing(1) },
  kindRow: { flexDirection: "row", gap: spacing(1) },
  kindChip: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: colors.line, paddingVertical: spacing(1.25), alignItems: "center", backgroundColor: colors.bg },
  kindChipActive: { borderColor: colors.green, backgroundColor: colors.greenTint },
  kindText: { fontFamily: fonts.bold, fontSize: 13, color: colors.heading },
  kindTextActive: { color: colors.green },
  columns: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginTop: spacing(1) },

  pickBox: { alignItems: "center", gap: 6, backgroundColor: colors.bgSoft, borderRadius: 16, borderWidth: 1, borderColor: colors.line, borderStyle: "dashed", paddingVertical: spacing(3), paddingHorizontal: spacing(2), marginTop: spacing(2) },
  pickText: { fontFamily: fonts.bold, fontSize: 14, color: colors.heading, marginTop: spacing(0.5) },
  pickHint: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted },
  uploadBtn: { backgroundColor: colors.green, borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center", marginTop: spacing(1.5) },
  uploadText: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },

  jobCard: { backgroundColor: colors.bg, borderRadius: 16, borderWidth: 1, borderColor: colors.lineSoft, padding: spacing(1.75), marginTop: spacing(2) },
  jobTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  jobName: { flex: 1, fontFamily: fonts.bold, fontSize: 14, color: colors.heading, marginRight: spacing(1) },
  barTrack: { height: 8, borderRadius: 5, backgroundColor: colors.bgSoft, overflow: "hidden", marginTop: spacing(1.25) },
  barFill: { height: "100%", borderRadius: 5, backgroundColor: colors.green },
  jobMeta: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginTop: spacing(1) },
  jobError: { fontFamily: fonts.semibold, fontSize: 12, color: colors.error, marginTop: spacing(0.75) },
  errBox: { backgroundColor: colors.errorTint, borderRadius: 10, padding: spacing(1.25), marginTop: spacing(1.25) },
  errRow: { fontFamily: fontsAlt.regular, fontSize: 12, color: "#a3382f", lineHeight: 18 },
  errMore: { fontFamily: fonts.semibold, fontSize: 12, color: colors.error, marginTop: 2 },

  empty: { fontFamily: fontsAlt.regular, fontSize: 13, color: colors.muted },
  recentRow: { flexDirection: "row", alignItems: "center", gap: spacing(1.25), backgroundColor: colors.bg, borderRadius: 14, borderWidth: 1, borderColor: colors.lineSoft, padding: spacing(1.5), marginBottom: spacing(1.25), shadowColor: "#1c2b36", shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  recentName: { fontFamily: fonts.bold, fontSize: 14, color: colors.heading },
  recentMeta: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginTop: 2 },

  pill: { borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8 },
  pillText: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 0.4 },
});
