import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useCreateAddressMutation, useUpdateAddressMutation } from "../api/baseApi";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { useToast } from "../components/Toast";
import type { ProfileStackParamList } from "../navigation/ProfileStack";
import { colors, fonts, fontsAlt, spacing } from "../theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

// `value` is what the backend stores (lowercase choices); `label` is shown.
const TYPES: { value: string; label: string; icon: IoniconName }[] = [
  { value: "home", label: "Home", icon: "home-outline" },
  { value: "work", label: "Work", icon: "briefcase-outline" },
  { value: "other", label: "Other", icon: "location-outline" },
];

function Field({
  label,
  optional,
  ...props
}: React.ComponentProps<typeof TextInput> & { label: string; optional?: boolean }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {optional ? <Text style={styles.optional}> (optional)</Text> : null}
      </Text>
      <TextInput style={styles.input} placeholderTextColor={colors.muted} {...props} />
    </View>
  );
}

export default function AddAddressScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<ProfileStackParamList, "AddAddress">>();
  const existing = route.params?.address;
  const isEdit = !!existing;
  const toast = useToast();
  const [createAddress, { isLoading: creating }] = useCreateAddressMutation();
  const [updateAddress, { isLoading: updating }] = useUpdateAddressMutation();
  const isLoading = creating || updating;

  // In edit mode the stored address_line goes into the first field (we can't
  // reliably split it back into flat/street).
  const [type, setType] = useState(existing?.label || "home");
  const [flat, setFlat] = useState(existing?.address_line || "");
  const [street, setStreet] = useState("");
  const [landmark, setLandmark] = useState(existing?.landmark || "");
  const [city, setCity] = useState(existing?.city || "");
  const [stateName, setStateName] = useState(existing?.state || "");
  const [pincode, setPincode] = useState(existing?.pincode || "");
  const [error, setError] = useState("");

  const active = TYPES.find((t) => t.value === type);

  async function onSubmit() {
    setError("");
    const addressLine = [flat.trim(), street.trim()].filter(Boolean).join(", ");
    if (!addressLine || !city.trim() || !stateName.trim() || pincode.trim().length !== 6) {
      setError("Fill in the flat/street, city, state and a 6-digit pincode.");
      return;
    }
    const body = {
      label: type,
      address_line: addressLine,
      landmark: landmark.trim(),
      city: city.trim(),
      state: stateName.trim(),
      pincode: pincode.trim(),
    };
    try {
      if (isEdit) {
        await updateAddress({ id: existing.id, ...body }).unwrap();
        toast("Address updated.");
      } else {
        await createAddress(body).unwrap();
        toast("Address added.");
      }
      navigation.goBack();
    } catch {
      setError("Couldn't save the address. Please try again.");
    }
  }

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.blob} />
            <Text style={styles.headerTitle}>{isEdit ? "Edit Address" : "Add Address"}</Text>
            <Text style={styles.headerSub}>
              {isEdit ? "Update your delivery details" : "Where should we deliver?"}
            </Text>
          </View>

          <View style={styles.body}>
            {/* Address type */}
            <Text style={styles.label}>Address Type</Text>
            <View style={styles.typeBox}>
              <Ionicons name={active?.icon ?? "home-outline"} size={18} color={colors.green} />
              <Text style={styles.typeBoxText}>{active?.label ?? "Home"}</Text>
              <Ionicons name="chevron-down" size={16} color={colors.muted} />
            </View>
            <View style={styles.typeChips}>
              {TYPES.map((t) => {
                const isActive = t.value === type;
                return (
                  <Pressable
                    key={t.value}
                    onPress={() => setType(t.value)}
                    style={[styles.chip, isActive && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{t.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Field
              label="Flat / House No., Building"
              value={flat}
              onChangeText={setFlat}
              placeholder="e.g. Flat 204, Green Residency"
            />
            <Field
              label="Street / Area"
              value={street}
              onChangeText={setStreet}
              placeholder="Street name, locality"
            />
            <Field
              label="Landmark"
              optional
              value={landmark}
              onChangeText={setLandmark}
              placeholder="Nearby landmark"
            />

            <View style={styles.row}>
              <View style={styles.col}>
                <Field label="City" value={city} onChangeText={setCity} placeholder="City" />
              </View>
              <View style={styles.col}>
                <Field label="State" value={stateName} onChangeText={setStateName} placeholder="State" />
              </View>
            </View>

            <Field
              label="Pincode"
              value={pincode}
              onChangeText={(t) => setPincode(t.replace(/[^0-9]/g, "").slice(0, 6))}
              placeholder="6-digit pincode"
              keyboardType="number-pad"
              maxLength={6}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button
              title={isEdit ? "Save Changes" : "Add Address"}
              onPress={onSubmit}
              loading={isLoading}
              style={{ marginTop: spacing(1) }}
            />
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => navigation.goBack()}
              style={{ marginTop: spacing(1) }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingBottom: spacing(4) },

  // Header — matches the other dark cards.
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

  body: { paddingHorizontal: spacing(2.5), paddingTop: spacing(2.5) },

  label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.heading, marginBottom: spacing(0.75) },
  optional: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted },

  // Address type
  typeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1),
    borderWidth: 1.5,
    borderColor: colors.green,
    borderRadius: 12,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing(1.5),
    height: 50,
  },
  typeBoxText: { flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: colors.heading },
  typeChips: { flexDirection: "row", gap: spacing(1), marginTop: spacing(1.25), marginBottom: spacing(1) },
  chip: {
    paddingVertical: spacing(0.5),
    paddingHorizontal: spacing(1.75),
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg,
  },
  chipActive: { backgroundColor: colors.greenTint, borderColor: colors.green },
  chipText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  chipTextActive: { color: colors.green },

  // Inputs
  field: { marginTop: spacing(1.5) },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1.5),
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.heading,
  },
  row: { flexDirection: "row", gap: spacing(1.5) },
  col: { flex: 1 },

  error: { color: colors.error, fontFamily: fontsAlt.regular, fontSize: 13, marginTop: spacing(1.5) },
});
