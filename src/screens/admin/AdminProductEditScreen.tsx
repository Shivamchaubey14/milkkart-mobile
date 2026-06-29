import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  AdminVariant,
  useAdminCategoriesQuery,
  useAdminCreateProductMutation,
  useAdminCreateVariantMutation,
  useAdminDeleteVariantMutation,
  useAdminProductQuery,
  useAdminUpdateProductMutation,
  useAdminUpdateVariantMutation,
} from "../../api/baseApi";
import { Screen } from "../../components/Screen";
import { useToast } from "../../components/Toast";
import type { AdminStackParamList } from "../../navigation/AdminStack";
import { colors, fonts, fontsAlt, spacing } from "../../theme";

type Nav = NativeStackNavigationProp<AdminStackParamList>;
const money = (n: number | string) => "₹" + Number(n).toFixed(2);

function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput placeholderTextColor={colors.muted} style={styles.input} {...props} />
    </View>
  );
}

export default function AdminProductEditScreen() {
  const navigation = useNavigation<Nav>();
  const toast = useToast();
  const { productId } = useRoute<RouteProp<AdminStackParamList, "AdminProductEdit">>().params ?? {};
  const isNew = !productId;

  const { data: categories } = useAdminCategoriesQuery();
  const { data: product, isLoading } = useAdminProductQuery(productId as number, { skip: isNew });
  const [createProduct, { isLoading: creating }] = useAdminCreateProductMutation();
  const [updateProduct, { isLoading: updating }] = useAdminUpdateProductMutation();
  const [createVariant] = useAdminCreateVariantMutation();
  const [updateVariant] = useAdminUpdateVariantMutation();
  const [deleteVariant] = useAdminDeleteVariantMutation();

  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [tags, setTags] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [variantModal, setVariantModal] = useState<AdminVariant | "new" | null>(null);

  // Hydrate the form once the product loads (edit mode).
  useEffect(() => {
    if (!product) return;
    setName(product.name);
    setBrand(product.brand);
    setDescription(product.description);
    setImageUrl(product.image_url);
    setTags(product.tags);
    setCategoryId(product.category);
    setIsActive(product.is_active);
  }, [product]);

  async function save() {
    if (!name.trim()) return toast("Give the product a name.", "info");
    if (!categoryId) return toast("Pick a category.", "info");
    const body = { name: name.trim(), brand: brand.trim(), description: description.trim(), image_url: imageUrl.trim(), tags: tags.trim(), category: categoryId, is_active: isActive };
    try {
      if (isNew) {
        const created = await createProduct(body).unwrap();
        toast("Product created — add variants below.");
        navigation.replace("AdminProductEdit", { productId: created.id });
      } else {
        await updateProduct({ id: productId as number, ...body }).unwrap();
        toast("Product saved.");
      }
    } catch (e: any) {
      toast(e?.data?.detail || e?.data?.error || "Couldn't save. Check the fields.", "error");
    }
  }

  function onDeleteVariant(v: AdminVariant) {
    Alert.alert("Delete variant", `Delete “${v.label}”?`, [
      { text: "Keep", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try { await deleteVariant(v.id).unwrap(); toast("Variant deleted"); } catch { toast("Couldn't delete.", "error"); }
      } },
    ]);
  }

  const saving = creating || updating;

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <View style={styles.blob} />
        <View style={styles.headerRow}>
          <Pressable style={styles.back} onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="arrow-back" size={20} color={colors.white} />
          </Pressable>
          <Text style={styles.headerTitle}>{isNew ? "New product" : "Edit product"}</Text>
        </View>
      </View>

      {!isNew && isLoading ? (
        <ActivityIndicator color={colors.green} style={{ marginTop: spacing(4) }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
          <Field label="Name" value={name} onChangeText={setName} placeholder="Amul Gold Milk" />
          <Field label="Brand" value={brand} onChangeText={setBrand} placeholder="Amul" />
          <Field label="Image URL" value={imageUrl} onChangeText={setImageUrl} placeholder="https://…" autoCapitalize="none" />
          <Field label="Tags" value={tags} onChangeText={setTags} placeholder="milk, dairy" autoCapitalize="none" />
          <Field label="Description" value={description} onChangeText={setDescription} placeholder="Short description" multiline />

          <Text style={styles.fieldLabel}>Category</Text>
          <View style={styles.catWrap}>
            {(categories ?? []).map((c) => {
              const active = c.id === categoryId;
              return (
                <Pressable key={c.id} onPress={() => setCategoryId(c.id)} style={[styles.catChip, active && styles.catChipActive]}>
                  <Text style={[styles.catChipText, active && styles.catChipTextActive]}>{c.name}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Active (visible in store)</Text>
            <Switch value={isActive} onValueChange={setIsActive} trackColor={{ true: colors.green }} thumbColor={colors.white} />
          </View>

          <Pressable style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={save} disabled={saving}>
            <Text style={styles.saveText}>{saving ? "Saving…" : isNew ? "Create product" : "Save changes"}</Text>
          </Pressable>

          {/* Variants — only after the product exists. */}
          {!isNew ? (
            <View style={styles.variantsSection}>
              <View style={styles.variantsHead}>
                <Text style={styles.sectionTitle}>Variants</Text>
                <Pressable style={styles.addVariant} onPress={() => setVariantModal("new")}>
                  <Ionicons name="add" size={16} color={colors.green} />
                  <Text style={styles.addVariantText}>Add</Text>
                </Pressable>
              </View>
              {(product?.variants ?? []).length === 0 ? (
                <Text style={styles.emptyVariants}>No variants yet. Add at least one so the product can be sold.</Text>
              ) : (
                product?.variants.map((v) => (
                  <View key={v.id} style={styles.variantRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.variantLabel}>
                        {v.label}{v.is_default ? "  · default" : ""}{v.is_active ? "" : "  · inactive"}
                      </Text>
                      <Text style={styles.variantMeta}>
                        {money(v.price)} · MRP {money(v.mrp)} · {v.stock} in stock
                      </Text>
                    </View>
                    <Pressable hitSlop={8} onPress={() => setVariantModal(v)} style={styles.variantIcon}>
                      <Ionicons name="create-outline" size={18} color={colors.info} />
                    </Pressable>
                    <Pressable hitSlop={8} onPress={() => onDeleteVariant(v)} style={styles.variantIcon}>
                      <Ionicons name="trash-outline" size={18} color={colors.error} />
                    </Pressable>
                  </View>
                ))
              )}
            </View>
          ) : null}
        </ScrollView>
      )}

      {variantModal !== null ? (
        <VariantModal
          variant={variantModal === "new" ? null : variantModal}
          onClose={() => setVariantModal(null)}
          onSave={async (body) => {
            try {
              if (variantModal === "new") await createVariant({ productId: productId as number, ...body }).unwrap();
              else await updateVariant({ id: variantModal.id, ...body }).unwrap();
              toast("Variant saved");
              setVariantModal(null);
            } catch (e: any) {
              toast(e?.data?.detail || "Couldn't save the variant.", "error");
            }
          }}
        />
      ) : null}
    </Screen>
  );
}

// ---- Add/edit a variant in a bottom sheet ---------------------------------
function VariantModal({
  variant,
  onClose,
  onSave,
}: {
  variant: AdminVariant | null;
  onClose: () => void;
  onSave: (body: Partial<AdminVariant>) => void;
}) {
  const [label, setLabel] = useState(variant?.label ?? "");
  const [price, setPrice] = useState(variant?.price ?? "");
  const [mrp, setMrp] = useState(variant?.mrp ?? "");
  const [stock, setStock] = useState(String(variant?.stock ?? ""));
  const [unit, setUnit] = useState(variant?.unit ?? "");
  const [quantityValue, setQuantityValue] = useState(variant?.quantity_value ?? "");
  const [isDefault, setIsDefault] = useState(variant?.is_default ?? false);
  const [isActive, setIsActive] = useState(variant?.is_active ?? true);

  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{variant ? "Edit variant" : "New variant"}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Field label="Label" value={label} onChangeText={setLabel} placeholder="500 ml" />
            <View style={styles.modalRow}>
              <View style={{ flex: 1 }}><Field label="Price" value={price} onChangeText={setPrice} placeholder="32" keyboardType="decimal-pad" /></View>
              <View style={{ flex: 1 }}><Field label="MRP" value={mrp} onChangeText={setMrp} placeholder="35" keyboardType="decimal-pad" /></View>
            </View>
            <View style={styles.modalRow}>
              <View style={{ flex: 1 }}><Field label="Stock" value={stock} onChangeText={setStock} placeholder="100" keyboardType="number-pad" /></View>
              <View style={{ flex: 1 }}><Field label="Unit" value={unit} onChangeText={setUnit} placeholder="ml" autoCapitalize="none" /></View>
            </View>
            <Field label="Quantity value" value={quantityValue} onChangeText={setQuantityValue} placeholder="500" keyboardType="decimal-pad" />
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Default variant</Text>
              <Switch value={isDefault} onValueChange={setIsDefault} trackColor={{ true: colors.green }} thumbColor={colors.white} />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Active</Text>
              <Switch value={isActive} onValueChange={setIsActive} trackColor={{ true: colors.green }} thumbColor={colors.white} />
            </View>
          </ScrollView>
          <View style={styles.modalActions}>
            <Pressable style={[styles.btn, styles.btnGhost]} onPress={onClose}>
              <Text style={styles.btnGhostText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.btnPrimary]}
              onPress={() =>
                onSave({
                  label: label.trim(),
                  price: price.trim(),
                  mrp: mrp.trim(),
                  stock: parseInt(stock, 10) || 0,
                  unit: unit.trim(),
                  quantity_value: quantityValue.trim(),
                  is_default: isDefault,
                  is_active: isActive,
                })
              }
            >
              <Text style={styles.btnPrimaryText}>Save</Text>
            </Pressable>
          </View>
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

  body: { paddingHorizontal: spacing(2.5), paddingTop: spacing(2), paddingBottom: spacing(5) },
  field: { marginBottom: spacing(1.75) },
  fieldLabel: { fontFamily: fontsAlt.extrabold, fontSize: 11, letterSpacing: 0.8, color: colors.muted, marginBottom: spacing(0.75) },
  input: { backgroundColor: colors.bgSoft, borderRadius: 12, borderWidth: 1, borderColor: colors.line, paddingHorizontal: spacing(1.75), paddingVertical: spacing(1.5), fontFamily: fonts.medium, fontSize: 15, color: colors.heading },

  catWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing(1), marginBottom: spacing(1.75) },
  catChip: { paddingVertical: spacing(0.75), paddingHorizontal: spacing(1.75), borderRadius: 999, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.bg },
  catChipActive: { backgroundColor: colors.green, borderColor: colors.green },
  catChipText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.heading },
  catChipTextActive: { color: colors.white },

  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing(1) },
  switchLabel: { fontFamily: fonts.semibold, fontSize: 14, color: colors.heading },

  saveBtn: { backgroundColor: colors.green, borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center", marginTop: spacing(1.5) },
  saveText: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },

  variantsSection: { marginTop: spacing(3.5) },
  variantsHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing(1.5) },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.heading },
  addVariant: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.greenTint, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12 },
  addVariantText: { fontFamily: fonts.bold, fontSize: 13, color: colors.green },
  emptyVariants: { fontFamily: fontsAlt.regular, fontSize: 13, color: colors.muted, lineHeight: 19 },
  variantRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.bg, borderRadius: 14, borderWidth: 1, borderColor: colors.lineSoft, padding: spacing(1.5), marginBottom: spacing(1.25), gap: spacing(1) },
  variantLabel: { fontFamily: fonts.bold, fontSize: 14, color: colors.heading },
  variantMeta: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  variantIcon: { padding: 4 },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: spacing(2.5), paddingTop: spacing(1.5), paddingBottom: spacing(3), maxHeight: "88%" },
  modalHandle: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: spacing(1.5) },
  modalTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.heading, marginBottom: spacing(1.5) },
  modalRow: { flexDirection: "row", gap: spacing(1.5) },
  modalActions: { flexDirection: "row", gap: spacing(1.25), marginTop: spacing(1.5) },
  btn: { flex: 1, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  btnPrimary: { backgroundColor: colors.green },
  btnPrimaryText: { fontFamily: fonts.bold, fontSize: 15, color: colors.white },
  btnGhost: { backgroundColor: colors.bgSoft },
  btnGhostText: { fontFamily: fonts.bold, fontSize: 15, color: colors.heading },
});
