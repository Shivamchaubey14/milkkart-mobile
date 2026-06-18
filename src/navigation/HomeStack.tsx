import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeScreen from "../screens/HomeScreen";
import ProductScreen from "../screens/ProductScreen";

export type HomeStackParamList = {
  HomeFeed: undefined;
  Product: { slug: string };
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeFeed" component={HomeScreen} />
      <Stack.Screen
        name="Product"
        component={ProductScreen}
        options={{ animation: "slide_from_right" }}
      />
    </Stack.Navigator>
  );
}
