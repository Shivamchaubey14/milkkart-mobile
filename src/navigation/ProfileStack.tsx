import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { Address } from "../api/baseApi";
import AccountScreen from "../screens/AccountScreen";
import AddAddressScreen from "../screens/AddAddressScreen";
import OrderDetailScreen from "../screens/OrderDetailScreen";
import OrdersScreen from "../screens/OrdersScreen";
import ProfileScreen from "../screens/ProfileScreen";
import WalletScreen from "../screens/WalletScreen";

export type ProfileStackParamList = {
  ProfileHome: undefined;
  Account: undefined;
  AddAddress: { address?: Address } | undefined;
  Wallet: undefined;
  Orders: undefined;
  OrderDetail: { orderNumber: string };
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileHome" component={ProfileScreen} />
      <Stack.Screen name="Account" component={AccountScreen} />
      <Stack.Screen name="AddAddress" component={AddAddressScreen} />
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen name="Orders" component={OrdersScreen} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
    </Stack.Navigator>
  );
}
