import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { Address, RiderDeliveryKind } from "../api/baseApi";
import AccountScreen from "../screens/AccountScreen";
import AddAddressScreen from "../screens/AddAddressScreen";
import OrderDetailScreen from "../screens/OrderDetailScreen";
import OrdersScreen from "../screens/OrdersScreen";
import ProfileScreen from "../screens/ProfileScreen";
import RiderDeliveriesScreen from "../screens/RiderDeliveriesScreen";
import RiderEarningsScreen from "../screens/RiderEarningsScreen";
import SubscriptionsScreen from "../screens/SubscriptionsScreen";
import SupportScreen from "../screens/SupportScreen";
import TrackOrderScreen from "../screens/TrackOrderScreen";
import WalletScreen from "../screens/WalletScreen";

export type ProfileStackParamList = {
  ProfileHome: undefined;
  Account: undefined;
  AddAddress: { address?: Address } | undefined;
  Wallet: undefined;
  Orders: undefined;
  OrderDetail: { orderNumber: string };
  TrackOrder: { orderNumber: string };
  Subscriptions: undefined;
  Support: undefined;
  // Rider history screens, reachable from the profile stat rows.
  RiderDeliveries: { kind: RiderDeliveryKind };
  RiderEarnings: undefined;
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
      <Stack.Screen name="TrackOrder" component={TrackOrderScreen} />
      <Stack.Screen name="Subscriptions" component={SubscriptionsScreen} />
      <Stack.Screen name="Support" component={SupportScreen} />
      <Stack.Screen name="RiderDeliveries" component={RiderDeliveriesScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="RiderEarnings" component={RiderEarningsScreen} options={{ animation: "slide_from_right" }} />
    </Stack.Navigator>
  );
}
