import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  OrderSummary,
  SupportTicket,
  useCreateSupportTicketMutation,
  useFaqsQuery,
  useOrdersQuery,
  useSupportTicketsQuery,
} from "../api/baseApi";
import { Screen } from "../components/Screen";
import { useToast } from "../components/Toast";
import { colors, fonts, fontsAlt, shadow, spacing } from "../theme";

const SUPPORT_PHONE = "+918000000000";
const SUPPORT_EMAIL = "support@milkkart.in";

const REASONS = [
  { key: "wrong_item", label: "Wrong item" },
  { key: "missing_item", label: "Missing item" },
  { key: "damaged_item", label: "Damaged item" },
  { key: "quality_issue", label: "Quality issue" },
  { key: "other", label: "Other" },
];

const TICKET_STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  open: { label: "OPEN", bg: "#fff4d6", fg: "#b98421" },
  in_progress: { label: "IN PROGRESS", bg: colors.greenTint, fg: colors.green },
  resolved: { label: "RESOLVED", bg: "#e8f2fc", fg: colors.info },
  rejected: { label: "REJECTED", bg: colors.errorTint, fg: colors.error },
};

const CONTACTS: { key: string; label: string; icon: React.ComponentProps<typeof Ionicons>["name"]; bg: string; fg: string }[] = [
  { key: "chat", label: "Live chat", icon: "chatbubbles", bg: colors.greenTint, fg: colors.green },
  { key: "call", label: "Call us", icon: "call", bg: colors.yellowTint, fg: "#b98421" },
  { key: "email", label: "Email", icon: "mail", bg: colors.infoTint, fg: colors.info },
];

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function SupportScreen() {
  const toast = useToast();
  const { data: faqs } = useFaqsQuery();
  const { data: tickets } = useSupportTicketsQuery();
  const { data: orders } = useOrdersQuery();
  const [createTicket, { isLoading: submitting }] = useCreateSupportTicketMutation();

  const [reason, setReason] = useState("wrong_item");
  const [reasonOpen, setReasonOpen] = useState(false);
  const [orderQuery, setOrderQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<OrderSummary | null>(null);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const matches = orderQuery.trim()
    ? (orders ?? [])
        .filter((o) => o.order_number.toLowerCase().includes(orderQuery.trim().toLowerCase()))
        .slice(0, 6)
    : [];

  function onContact(key: string) {
    if (key === "call") Linking.openURL(`tel:${SUPPORT_PHONE}`);
    else if (key === "email") Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=MilkKart support`);
    else toast("Live chat — coming soon.");
  }

  async function onSubmit() {
    if (!subject.trim()) {
      toast("Add a short subject.", "info");
      return;
    }
    try {
      await createTicket({
        reason,
        subject: subject.trim(),
        description: description.trim(),
        order_number: selectedOrder?.order_number ?? null,
      }).unwrap();
      toast("Ticket submitted — we'll get back to you soon.");
      setSubject("");
      setDescription("");
      setSelectedOrder(null);
      setOrderQuery("");
      setReason("wrong_item");
    } catch (e: any) {
      toast(e?.data?.error || e?.data?.detail || "Couldn't submit. Try again.", "error");
    }
  }

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.blob} />
            <Text style={styles.headerTitle}>Help & Support</Text>
            <Text style={styles.headerSub}>We usually reply within an hour</Text>
          </View>

          {/* Contact cards (pulled up over the header). */}
          <View style={styles.contactRow}>
            {CONTACTS.map((c) => (
              <Pressable
                key={c.key}
                style={({ pressed }) => [styles.contactCard, { backgroundColor: c.bg }, pressed && { opacity: 0.85 }]}
                onPress={() => onContact(c.key)}
              >
                <View style={styles.contactIcon}>
                  <Ionicons name={c.icon} size={20} color={c.fg} />
                </View>
                <Text style={[styles.contactLabel, { color: c.fg }]}>{c.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.body}>
            {/* Raise a ticket */}
            <Text style={styles.sectionLabel}>RAISE A TICKET</Text>
            <View style={styles.card}>
              {/* Issue */}
              <Text style={styles.fieldLabel}>Issue</Text>
              <Pressable style={styles.select} onPress={() => setReasonOpen((o) => !o)}>
                <Text style={styles.selectText}>{REASONS.find((r) => r.key === reason)?.label}</Text>
                <Ionicons name={reasonOpen ? "chevron-up" : "chevron-down"} size={16} color={colors.muted} />
              </Pressable>
              {reasonOpen ? (
                <View style={styles.dropdown}>
                  {REASONS.map((r) => {
                    const active = r.key === reason;
                    return (
                      <Pressable
                        key={r.key}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setReason(r.key);
                          setReasonOpen(false);
                        }}
                      >
                        <Text style={[styles.dropdownText, active && styles.dropdownTextActive]}>{r.label}</Text>
                        {active ? <Ionicons name="checkmark" size={16} color={colors.green} /> : null}
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}

              {/* Related order — searchable by order number */}
              <Text style={styles.fieldLabel}>Related order</Text>
              {selectedOrder ? (
                <View style={styles.selectedOrder}>
                  <View style={styles.selectedOrderIcon}>
                    <Ionicons name="receipt-outline" size={16} color={colors.green} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.selectedOrderNo}>#{selectedOrder.order_number.slice(0, 8)}</Text>
                    <Text style={styles.selectedOrderMeta}>
                      {fmtDate(selectedOrder.placed_at)} · ₹{Number(selectedOrder.total).toFixed(2)}
                    </Text>
                  </View>
                  <Pressable
                    hitSlop={8}
                    onPress={() => {
                      setSelectedOrder(null);
                      setOrderQuery("");
                    }}
                  >
                    <Ionicons name="close-circle" size={20} color={colors.muted} />
                  </Pressable>
                </View>
              ) : (
                <>
                  <View style={styles.searchField}>
                    <Ionicons name="search" size={16} color={colors.muted} />
                    <TextInput
                      style={styles.searchInput}
                      value={orderQuery}
                      onChangeText={setOrderQuery}
                      placeholder="Search by order number"
                      placeholderTextColor={colors.muted}
                      autoCapitalize="none"
                    />
                  </View>
                  {matches.length > 0 ? (
                    <View style={styles.dropdown}>
                      {matches.map((o) => (
                        <Pressable
                          key={o.id}
                          style={styles.orderOption}
                          onPress={() => {
                            setSelectedOrder(o);
                            setOrderQuery("");
                          }}
                        >
                          <Text style={styles.orderOptNo}>#{o.order_number.slice(0, 8)}</Text>
                          <Text style={styles.orderOptMeta}>
                            {fmtDate(o.placed_at)} · ₹{Number(o.total).toFixed(2)}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : orderQuery.trim() ? (
                    <Text style={styles.hint}>No order matches “{orderQuery.trim()}”.</Text>
                  ) : (
                    <Text style={styles.hint}>Leave empty for a general query (no specific order).</Text>
                  )}
                </>
              )}

              {/* Subject */}
              <Text style={styles.fieldLabel}>Subject</Text>
              <TextInput
                style={styles.input}
                value={subject}
                onChangeText={setSubject}
                placeholder="Brief summary"
                placeholderTextColor={colors.muted}
              />

              {/* Description */}
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={description}
                onChangeText={setDescription}
                placeholder="What went wrong?"
                placeholderTextColor={colors.muted}
                multiline
                textAlignVertical="top"
              />

              <Pressable style={styles.submit} onPress={onSubmit} disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.submitText}>Submit ticket</Text>
                )}
              </Pressable>
            </View>

            {/* Your tickets */}
            <Text style={styles.sectionLabel}>YOUR TICKETS</Text>
            {tickets && tickets.length > 0 ? (
              tickets.map((t) => <TicketRow key={t.ticket_number} ticket={t} />)
            ) : (
              <View style={styles.emptyTickets}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="chatbox-ellipses-outline" size={26} color={colors.green} />
                </View>
                <Text style={styles.emptyTitle}>No tickets yet</Text>
                <Text style={styles.emptySub}>Raised tickets will appear here.</Text>
              </View>
            )}

            {/* FAQ */}
            <Text style={styles.sectionLabel}>FREQUENTLY ASKED</Text>
            {(faqs ?? []).map((f) => {
              const open = openFaq === f.id;
              return (
                <Pressable
                  key={f.id}
                  style={styles.faqItem}
                  onPress={() => setOpenFaq(open ? null : f.id)}
                >
                  <View style={styles.faqQRow}>
                    <Text style={styles.faqQ}>{f.question}</Text>
                    <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={colors.muted} />
                  </View>
                  {open ? <Text style={styles.faqA}>{f.answer}</Text> : null}
                </Pressable>
              );
            })}
            {faqs && faqs.length === 0 ? (
              <Text style={styles.hint}>No FAQs available right now.</Text>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function TicketRow({ ticket }: { ticket: SupportTicket }) {
  const s = TICKET_STATUS[ticket.status] ?? TICKET_STATUS.open;
  return (
    <View style={styles.ticket}>
      <View style={{ flex: 1 }}>
        <Text style={styles.ticketSubject} numberOfLines={1}>
          {ticket.subject}
        </Text>
        <Text style={styles.ticketMeta}>
          #{ticket.ticket_number.slice(0, 8)} · {fmtDate(ticket.created_at)}
          {ticket.order_number ? ` · order #${ticket.order_number.slice(0, 8)}` : ""}
        </Text>
      </View>
      <View style={[styles.ticketBadge, { backgroundColor: s.bg }]}>
        <Text style={[styles.ticketBadgeText, { color: s.fg }]}>{s.label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingBottom: spacing(4) },

  header: {
    backgroundColor: colors.heading,
    borderRadius: 26,
    marginHorizontal: spacing(2.5),
    marginTop: spacing(1),
    paddingHorizontal: spacing(2.5),
    paddingTop: spacing(2.5),
    paddingBottom: spacing(5),
    overflow: "hidden",
  },
  blob: {
    position: "absolute",
    top: -45,
    right: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(59,183,126,0.18)",
  },
  headerTitle: { fontFamily: fonts.bold, fontSize: 22, color: colors.white },
  headerSub: { fontFamily: fontsAlt.regular, fontSize: 13, color: colors.green, marginTop: 3 },

  // Contact cards overlap the header — soft tinted backgrounds, white icon chip.
  contactRow: {
    flexDirection: "row",
    gap: spacing(1.25),
    marginHorizontal: spacing(2.5),
    marginTop: -spacing(3.5),
  },
  contactCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: spacing(1.75),
    alignItems: "center",
    gap: spacing(0.75),
    ...shadow.card,
  },
  contactIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  contactLabel: { fontFamily: fonts.bold, fontSize: 12.5 },

  body: { paddingHorizontal: spacing(2.5), paddingTop: spacing(2.5) },
  sectionLabel: { fontFamily: fontsAlt.extrabold, fontSize: 11, letterSpacing: 1, color: colors.muted, marginTop: spacing(2.5), marginBottom: spacing(1.25) },

  card: {
    backgroundColor: colors.bg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    padding: spacing(2),
    ...shadow.card,
  },
  fieldLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.heading, marginTop: spacing(1.5), marginBottom: spacing(0.75) },

  select: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: colors.green,
    borderRadius: 12,
    paddingHorizontal: spacing(1.5),
    height: 48,
  },
  selectText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.heading },
  dropdown: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    backgroundColor: colors.bg,
    marginTop: spacing(0.75),
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1.25),
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  dropdownText: { fontFamily: fontsAlt.regular, fontSize: 14, color: colors.text },
  dropdownTextActive: { fontFamily: fonts.bold, color: colors.green },

  searchField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: spacing(1.5),
    height: 48,
  },
  searchInput: { flex: 1, fontFamily: fontsAlt.semibold, fontSize: 14, color: colors.heading },
  orderOption: { paddingHorizontal: spacing(1.5), paddingVertical: spacing(1.25), borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  orderOptNo: { fontFamily: fonts.bold, fontSize: 13, color: colors.heading },
  orderOptMeta: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginTop: 1 },
  selectedOrder: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.25),
    backgroundColor: colors.greenTint,
    borderRadius: 12,
    padding: spacing(1.25),
  },
  selectedOrderIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  selectedOrderNo: { fontFamily: fonts.bold, fontSize: 14, color: colors.heading },
  selectedOrderMeta: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.green, marginTop: 1 },
  hint: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginTop: spacing(0.75) },

  input: {
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: spacing(1.5),
    height: 48,
    fontFamily: fontsAlt.semibold,
    fontSize: 14,
    color: colors.heading,
  },
  textarea: { height: 92, paddingTop: spacing(1.25) },

  submit: {
    backgroundColor: colors.green,
    borderRadius: 14,
    paddingVertical: spacing(1.75),
    alignItems: "center",
    marginTop: spacing(2),
  },
  submitText: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },

  // Tickets
  emptyTickets: {
    backgroundColor: colors.bg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    alignItems: "center",
    paddingVertical: spacing(3),
    ...shadow.card,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.greenTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing(1.25),
  },
  emptyTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.heading },
  emptySub: { fontFamily: fontsAlt.regular, fontSize: 13, color: colors.muted, marginTop: 2 },

  ticket: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    padding: spacing(1.75),
    marginBottom: spacing(1.25),
  },
  ticketSubject: { fontFamily: fonts.bold, fontSize: 14, color: colors.heading },
  ticketMeta: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  ticketBadge: { borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8 },
  ticketBadgeText: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 0.4 },

  // FAQ
  faqItem: {
    backgroundColor: colors.bg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    paddingHorizontal: spacing(1.75),
    paddingVertical: spacing(1.5),
    marginBottom: spacing(1),
  },
  faqQRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing(1) },
  faqQ: { flex: 1, fontFamily: fonts.semibold, fontSize: 14, color: colors.heading },
  faqA: { fontFamily: fontsAlt.regular, fontSize: 13, color: colors.text, lineHeight: 20, marginTop: spacing(1) },
});
