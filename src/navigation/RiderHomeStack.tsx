import { createNativeStackNavigator } from "@react-navigation/native-stack";

import RiderHomeScreen from "../screens/RiderHomeScreen";
import RiderNavigateScreen from "../screens/RiderNavigateScreen";

// Stack behind the rider's Home tab so the home dashboard can push the
// full-screen navigation map for an active delivery.
export type RiderHomeStackParamList = {
  RiderHome: undefined;
  RiderNavigate: { orderNumber: string; address: string; destLat: string | null; destLng: string | null };
};

const Stack = createNativeStackNavigator<RiderHomeStackParamList>();

export default function RiderHomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RiderHome" component={RiderHomeScreen} />
      <Stack.Screen name="RiderNavigate" component={RiderNavigateScreen} options={{ animation: "slide_from_right" }} />
    </Stack.Navigator>
  );
}
