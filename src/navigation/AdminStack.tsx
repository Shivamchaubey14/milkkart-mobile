import { createNativeStackNavigator } from "@react-navigation/native-stack";

import AdminHomeScreen from "../screens/admin/AdminHomeScreen";
import AdminOrdersScreen from "../screens/admin/AdminOrdersScreen";
import AdminPlaceholderScreen from "../screens/admin/AdminPlaceholderScreen";

export type AdminStackParamList = {
  AdminHome: undefined;
  AdminOrders: undefined;
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
      <Stack.Screen name="AdminSection" component={AdminPlaceholderScreen} options={{ animation: "slide_from_right" }} />
    </Stack.Navigator>
  );
}
