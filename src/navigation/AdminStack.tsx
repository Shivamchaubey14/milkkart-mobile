import { createNativeStackNavigator } from "@react-navigation/native-stack";

import AdminCatalogScreen from "../screens/admin/AdminCatalogScreen";
import AdminDashboardScreen from "../screens/admin/AdminDashboardScreen";
import AdminHomeScreen from "../screens/admin/AdminHomeScreen";
import AdminInventoryScreen from "../screens/admin/AdminInventoryScreen";
import AdminOrdersScreen from "../screens/admin/AdminOrdersScreen";
import AdminPlaceholderScreen from "../screens/admin/AdminPlaceholderScreen";
import AdminProductEditScreen from "../screens/admin/AdminProductEditScreen";

export type AdminStackParamList = {
  AdminHome: undefined;
  AdminOrders: undefined;
  AdminCatalog: undefined;
  AdminProductEdit: { productId?: number };
  AdminDashboard: undefined;
  AdminInventory: undefined;
  AdminSection: { key: string; title: string };
};

const Stack = createNativeStackNavigator<AdminStackParamList>();

// Back-office area shown to staff (admin/ops/warehouse/support). A section menu
// roots it; Orders is a working screen, the rest open a placeholder for now.
export default function AdminStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminHome" component={AdminHomeScreen} />
      <Stack.Screen name="AdminOrders" component={AdminOrdersScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="AdminCatalog" component={AdminCatalogScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="AdminProductEdit" component={AdminProductEditScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="AdminInventory" component={AdminInventoryScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="AdminSection" component={AdminPlaceholderScreen} options={{ animation: "slide_from_right" }} />
    </Stack.Navigator>
  );
}
