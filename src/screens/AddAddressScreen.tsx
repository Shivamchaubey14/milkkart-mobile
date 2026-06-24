import { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";

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
  const scrollRef = useRef<ScrollView>(null);
  const mapRef = useRef<MapView>(null);

  // The exact delivery point. Pre-fills from a saved address; otherwise we ask
  // for the device location so the pin starts where the customer is.
  const existingLat = existing?.latitude != null ? Number(existing.latitude) : null;
  const existingLng = existing?.longitude != null ? Number(existing.longitude) : null;
  const [coord, setCoord] = useState<{ latitude: number; longitude: number } | null>(
    existingLat != null && existingLng != null ? { latitude: existingLat, longitude: existingLng } : null,
  );
  const [locating, setLocating] = useState(false);

  async function useMyLocation() {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        toast("Location permission denied — drag the pin instead.", "info");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const c = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setCoord(c);
      mapRef.current?.animateToRegion({ ...c, latitudeDelta: 0.006, longitudeDelta: 0.006 }, 600);
    } catch {
      toast("Couldn't get your location — drag the pin instead.", "info");
    } finally {
      setLocating(false);
    }
  }

  // For a new address, center on the device location once.
  useEffect(() => {
    if (!coord) useMyLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      // The pinned point wins over server geocoding. Round to 6 dp — the column
      // is Decimal(9,6), so raw GPS precision would be rejected.
      ...(coord
        ? { latitude: Number(coord.latitude.toFixed(6)), longitude: Number(coord.longitude.toFixed(6)) }
        : {}),
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
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
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
              onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 250)}
            />

            {/* Exact location — pin it on the map so delivery lands precisely. */}
            <Text style={[styles.label, { marginTop: spacing(2) }]}>Pin your exact location</Text>
            <Text style={styles.mapHint}>Drag the pin or tap the map to set your precise delivery spot.</Text>
            <View style={styles.mapWrap}>
              <MapView
                ref={mapRef}
                provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
                style={styles.map}
                initialRegion={
                  coord
                    ? { ...coord, latitudeDelta: 0.006, longitudeDelta: 0.006 }
                    : { latitude: 22.97, longitude: 78.65, latitudeDelta: 14, longitudeDelta: 14 }
                }
                onPress={(e) => setCoord(e.nativeEvent.coordinate)}
              >
                {coord ? (
                  <Marker
                    coordinate={coord}
                    draggable
                    onDragEnd={(e) => setCoord(e.nativeEvent.coordinate)}
                    anchor={{ x: 0.5, y: 1 }}
                  >
                    <View style={styles.pin}>
                      <Ionicons name="location" size={20} color={colors.white} />
                    </View>
                  </Marker>
                ) : null}
              </MapView>
              <Pressable style={styles.locBtn} onPress={useMyLocation} disabled={locating}>
                {locating ? (
                  <ActivityIndicator size="small" color={colors.green} />
                ) : (
                  <>
                    <Ionicons name="locate" size={15} color={colors.green} />
                    <Text style={styles.locText}>My location</Text>
                  </>
                )}
              </Pressable>
            </View>

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

  // Map picker
  mapHint: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginBottom: spacing(1) },
  mapWrap: { height: 200, borderRadius: 14, overflow: "hidden", backgroundColor: colors.bgSoft },
  map: { flex: 1 },
  pin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.green,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  locBtn: {
    position: "absolute",
    right: spacing(1.25),
    bottom: spacing(1.25),
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.bg,
    borderRadius: 999,
    paddingVertical: spacing(0.75),
    paddingHorizontal: spacing(1.25),
    minWidth: 64,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  locText: { fontFamily: fonts.bold, fontSize: 12, color: colors.green },

  error: { color: colors.error, fontFamily: fontsAlt.regular, fontSize: 13, marginTop: spacing(1.5) },
});
