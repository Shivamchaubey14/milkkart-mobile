import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  AdminCategory,
  AdminProduct,
  useAdminCategoriesQuery,
  useAdminCreateCategoryMutation,
  useAdminDeleteCategoryMutation,
  useAdminDeleteProductMutation,
  useAdminProductsQuery,
  useAdminUpdateCategoryMutation,
  useAdminUpdateProductMutation,
} from "../../api/baseApi";
import { imageUrl } from "../../api/config";
import { Screen } from "../../components/Screen";
import { ListSkeleton } from "../../components/Skeleton";
import { useToast } from "../../components/Toast";
import type { AdminStackParamList } from "../../navigation/AdminStack";
import { colors, fonts, fontsAlt, spacing } from "../../theme";

type Nav = NativeStackNavigationProp<AdminStackParamList>;

export default function AdminCatalogScreen() {
  const navigation = useNavigation<Nav>();
  const toast = useToast();
  const [tab, setTab] = useState<"products" | "categories">("products");

  const { data: products, isLoading: pLoading, isFetching: pFetching, refetch: refetchP } = useAdminProductsQuery();
  const { data: categories, isLoading: cLoading, isFetching: cFetching, refetch: refetchC } = useAdminCategoriesQuery();
  const [updateProduct] = useAdminUpdateProductMutation();
  const [deleteProduct] = useAdminDeleteProductMutation();
  const [updateCategory] = useAdminUpdateCategoryMutation();
  const [deleteCategory] = useAdminDeleteCategoryMutation();
  const [catModal, setCatModal] = useState<AdminCategory | "new" | null>(null);

  const toggleProduct = async (p: AdminProduct) => {
    try { await updateProduct({ id: p.id, is_active: !p.is_active }).unwrap(); } catch { toast("Couldn't update.", "error"); }
  };
  const onDeleteProduct = (p: AdminProduct) =>
    Alert.alert("Delete product", `Delete “${p.name}” and its variants?`, [
      { text: "Keep", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try { await deleteProduct(p.id).unwrap(); toast("Product deleted"); } catch { toast("Couldn't delete.", "error"); }
      } },
    ]);
  const toggleCategory = async (c: AdminCategory) => {
    try { await updateCategory({ id: c.id, is_active: !c.is_active }).unwrap(); } catch { toast("Couldn't update.", "error"); }
  };
  const onDeleteCategory = (c: AdminCategory) =>
    Alert.alert("Delete category", `Delete “${c.name}”?`, [
      { text: "Keep", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try { await deleteCategory(c.id).unwrap(); toast("Category deleted"); } catch { toast("Couldn't delete — it may still have products.", "error"); }
      } },
    ]);

  return (
    <Screen padded={false} style={{ backgroundColor: colors.bgSoft }}>
      <View style={styles.header}>
        <View style={styles.blob} />
        <View style={styles.headerRow}>
          <Pressable style={styles.back} onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="arrow-back" size={20} color={colors.white} />
          </Pressable>
          <Text style={styles.headerTitle}>Catalog</Text>
          <Pressable
            style={styles.addBtn}
            onPress={() => (tab === "products" ? navigation.navigate("AdminProductEdit", {}) : setCatModal("new"))}
            hitSlop={8}
          >
            <Ionicons name="add" size={22} color={colors.heading} />
          </Pressable>
        </View>
        <View style={styles.segment}>
          {(["products", "categories"] as const).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={[styles.segBtn, tab === t && styles.segBtnActive]}>
              <Text style={[styles.segText, tab === t && styles.segTextActive]}>
                {t === "products" ? "Products" : "Categories"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {tab === "products" ? (
        pLoading ? (
          <ListSkeleton rows={6} />
        ) : (
          <ScrollView
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={pFetching} onRefresh={refetchP} tintColor={colors.green} colors={[colors.green]} />}
          >
            {(products ?? []).map((p) => {
              const img = imageUrl(p.image_url);
              return (
                <Pressable key={p.id} style={styles.row} onPress={() => navigation.navigate("AdminProductEdit", { productId: p.id })}>
                  <View style={styles.thumb}>
                    {img ? (
                      <Image source={{ uri: img }} style={styles.thumbImg} resizeMode="cover" />
                    ) : (
                      <Ionicons name="image-outline" size={20} color={colors.muted} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName}>{p.name}</Text>
                    <Text style={styles.rowMeta}>
                      {p.category_name} · {p.variant_count} {p.variant_count === 1 ? "variant" : "variants"} · {p.total_stock} in stock
                    </Text>
                  </View>
                  {!p.is_active ? <View style={styles.offPill}><Text style={styles.offPillText}>OFF</Text></View> : null}
                  <Switch value={p.is_active} onValueChange={() => toggleProduct(p)} trackColor={{ true: colors.green }} thumbColor={colors.white} />
                  <Pressable hitSlop={8} onPress={() => onDeleteProduct(p)} style={styles.del}>
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                  </Pressable>
                </Pressable>
              );
            })}
          </ScrollView>
        )
      ) : cLoading ? (
        <ListSkeleton rows={6} thumb={false} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={cFetching} onRefresh={refetchC} tintColor={colors.green} colors={[colors.green]} />}
        >
          {(categories ?? []).map((c) => (
            <View key={c.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{c.name}</Text>
                <Text style={styles.rowMeta}>{c.product_count} {c.product_count === 1 ? "product" : "products"}</Text>
              </View>
              <Switch value={c.is_active} onValueChange={() => toggleCategory(c)} trackColor={{ true: colors.green }} thumbColor={colors.white} />
              <Pressable hitSlop={8} onPress={() => setCatModal(c)} style={styles.del}>
                <Ionicons name="create-outline" size={18} color={colors.info} />
              </Pressable>
              <Pressable hitSlop={8} onPress={() => onDeleteCategory(c)} style={styles.del}>
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}

      {catModal !== null ? (
        <CategoryModal category={catModal === "new" ? null : catModal} onClose={() => setCatModal(null)} />
      ) : null}
    </Screen>
  );
}

function CategoryModal({ category, onClose }: { category: AdminCategory | null; onClose: () => void }) {
  const toast = useToast();
  const [createCategory] = useAdminCreateCategoryMutation();
  const [updateCategory] = useAdminUpdateCategoryMutation();
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [sortOrder, setSortOrder] = useState(String(category?.sort_order ?? 0));
  const [isActive, setIsActive] = useState(category?.is_active ?? true);

  async function save() {
    if (!name.trim()) return toast("Give the category a name.", "info");
    const body = { name: name.trim(), description: description.trim(), sort_order: parseInt(sortOrder, 10) || 0, is_active: isActive };
    try {
      if (category) await updateCategory({ id: category.id, ...body }).unwrap();
      else await createCategory(body).unwrap();
      toast(category ? "Category updated" : "Category added");
      onClose();
    } catch (e: any) {
      toast(e?.data?.detail || "Couldn't save the category.", "error");
    }
  }

  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{category ? "Edit category" : "New category"}</Text>
          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Milk" placeholderTextColor={colors.muted} />
          <Text style={styles.fieldLabel}>Description</Text>
          <TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder="Optional" placeholderTextColor={colors.muted} />
          <Text style={styles.fieldLabel}>Sort order</Text>
          <TextInput style={styles.input} value={sortOrder} onChangeText={setSortOrder} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.muted} />
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Active</Text>
            <Switch value={isActive} onValueChange={setIsActive} trackColor={{ true: colors.green }} thumbColor={colors.white} />
          </View>
          <View style={styles.modalActions}>
            <Pressable style={[styles.btn, styles.btnGhost]} onPress={onClose}><Text style={styles.btnGhostText}>Cancel</Text></Pressable>
            <Pressable style={[styles.btn, styles.btnPrimary]} onPress={save}><Text style={styles.btnPrimaryText}>Save</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

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
  segText: { fontFamily: fonts.bold, fontSize: 14, color: "rgba(255,255,255,0.8)" },
  segTextActive: { color: colors.heading },

  list: { paddingHorizontal: spacing(2.5), paddingTop: spacing(2), paddingBottom: spacing(4) },
  row: { flexDirection: "row", alignItems: "center", gap: spacing(1.25), backgroundColor: colors.bg, borderRadius: 14, borderWidth: 1, borderColor: colors.lineSoft, padding: spacing(1.5), marginBottom: spacing(1.25), shadowColor: "#1c2b36", shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  thumb: { width: 48, height: 48, borderRadius: 12, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: colors.bgSoft, borderWidth: 1, borderColor: colors.lineSoft },
  thumbImg: { width: "100%", height: "100%" },
  rowName: { fontFamily: fonts.bold, fontSize: 14, color: colors.heading },
  rowMeta: { fontFamily: fontsAlt.regular, fontSize: 12, color: colors.muted, marginTop: 2, lineHeight: 17 },
  offPill: { backgroundColor: colors.errorTint, borderRadius: 6, paddingVertical: 2, paddingHorizontal: 6 },
  offPillText: { fontFamily: fonts.bold, fontSize: 9, color: colors.error },
  del: { padding: 4 },

  fieldLabel: { fontFamily: fontsAlt.extrabold, fontSize: 11, letterSpacing: 0.8, color: colors.muted, marginBottom: spacing(0.75), marginTop: spacing(1) },
  input: { backgroundColor: colors.bgSoft, borderRadius: 12, borderWidth: 1, borderColor: colors.line, paddingHorizontal: spacing(1.75), paddingVertical: spacing(1.5), fontFamily: fonts.medium, fontSize: 15, color: colors.heading },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing(1.25) },
  switchLabel: { fontFamily: fonts.semibold, fontSize: 14, color: colors.heading },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: spacing(2.5), paddingTop: spacing(1.5), paddingBottom: spacing(3) },
  modalHandle: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: spacing(1.5) },
  modalTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.heading },
  modalActions: { flexDirection: "row", gap: spacing(1.25), marginTop: spacing(2) },
  btn: { flex: 1, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  btnPrimary: { backgroundColor: colors.green },
  btnPrimaryText: { fontFamily: fonts.bold, fontSize: 15, color: colors.white },
  btnGhost: { backgroundColor: colors.bgSoft },
  btnGhostText: { fontFamily: fonts.bold, fontSize: 15, color: colors.heading },
});
