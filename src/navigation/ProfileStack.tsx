import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { Address } from "../api/baseApi";
import AccountScreen from "../screens/AccountScreen";
import AddAddressScreen from "../screens/AddAddressScreen";
import ProfileScreen from "../screens/ProfileScreen";
import WalletScreen from "../screens/WalletScreen";

export type ProfileStackParamList = {
  ProfileHome: undefined;
  Account: undefined;
  AddAddress: { address?: Address } | undefined;
  Wallet: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileHome" component={ProfileScreen} />
      <Stack.Screen name="Account" component={AccountScreen} />
      <Stack.Screen name="AddAddress" component={AddAddressScreen} />
      <Stack.Screen name="Wallet" component={WalletScreen} />
    </Stack.Navigator>
  );
}
