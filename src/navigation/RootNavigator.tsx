import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "../screens/auth/LoginScreen";
import ProductScreen from "../screens/ProductScreen";
import { useAppSelector } from "../store/hooks";
import MainTabs from "./MainTabs";

export type RootStackParamList = {
  Main: undefined;
  Login: undefined;
  Product: { slug: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const access = useAppSelector((s) => s.auth.access);
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {access ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            {/* Full-screen (over the tabs) so the keyboard avoidance on the
                review form isn't fighting the bottom tab bar. */}
            <Stack.Screen
              name="Product"
              component={ProductScreen}
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
