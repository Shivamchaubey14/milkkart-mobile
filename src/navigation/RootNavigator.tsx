import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useMeQuery } from "../api/baseApi";
import PushRegistrar from "../notifications/PushRegistrar";
import CheckoutScreen from "../screens/CheckoutScreen";
import LoginScreen from "../screens/auth/LoginScreen";
import ProductScreen from "../screens/ProductScreen";
import SplashScreen from "../screens/SplashScreen";
import { useAppSelector } from "../store/hooks";
import AdminStack from "./AdminStack";
import MainTabs from "./MainTabs";
import RiderTabs from "./RiderTabs";

// Back-office roles get routed into the admin area instead of the storefront.
const STAFF_ROLES = ["admin", "ops", "warehouse", "support"];

export type RootStackParamList = {
  Main: undefined;
  Login: undefined;
  Product: { slug: string };
  Checkout: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const access = useAppSelector((s) => s.auth.access);
  // Profile drives which tab set to show. It's warmed on bootstrap/login, so it
  // usually resolves instantly; wait on a cold start to avoid a wrong-nav flash.
  const { data: me, isLoading } = useMeQuery(undefined, { skip: !access });

  if (access && !me && isLoading) {
    return <SplashScreen />;
  }
  const isRider = !!me?.is_rider;
  const isStaff = !!me?.role && STAFF_ROLES.includes(me.role);
  const HomeComponent = isStaff ? AdminStack : isRider ? RiderTabs : MainTabs;

  return (
    <NavigationContainer>
      {/* Register for push + buzz on foreground notifications once signed in. */}
      {access ? <PushRegistrar /> : null}
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {access ? (
          <>
            <Stack.Screen name="Main" component={HomeComponent} />
            {/* Full-screen (over the tabs) so the keyboard avoidance on the
                review form isn't fighting the bottom tab bar. */}
            <Stack.Screen
              name="Product"
              component={ProductScreen}
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="Checkout"
              component={CheckoutScreen}
              options={{ animation: "slide_from_right" }}
            />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
