import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCartQuery } from "../api/baseApi";
import CartScreen from "../screens/CartScreen";
import HomeScreen from "../screens/HomeScreen";
import PlaceholderScreen from "../screens/PlaceholderScreen";
import ProfileStack from "./ProfileStack";
import { colors, fonts, palette } from "../theme";

const Tab = createBottomTabNavigator();

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

// Maps each tab to its outline (inactive) and filled (active) Ionicon.
const TAB_ICONS: Record<string, [IoniconName, IoniconName]> = {
  Home: ["home-outline", "home"],
  Alerts: ["notifications-outline", "notifications"],
  Wishlist: ["heart-outline", "heart"],
  Cart: ["cart-outline", "cart"],
  Profile: ["person-outline", "person"],
};

const AlertsScreen = () => <PlaceholderScreen title="Alerts" icon="notifications-outline" />;
const WishlistScreen = () => <PlaceholderScreen title="Wishlist" icon="heart-outline" />;

export default function MainTabs() {
  const { data: cart } = useCartQuery();
  const cartCount = cart?.item_count ?? 0;
  // Respect the bottom safe area so the bar clears system nav / gesture bars.
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 8);
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11, marginBottom: 2 },
        tabBarStyle: {
          height: 60 + bottom,
          paddingBottom: bottom,
          paddingTop: 10,
          // Curved sheet in Cream Yolk, no shadow.
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          borderTopWidth: 0,
          borderTopColor: "transparent",
          backgroundColor: palette.yellow[50],
          elevation: 0,
          shadowOpacity: 0,
          shadowColor: "transparent",
          shadowRadius: 0,
          shadowOffset: { width: 0, height: 0 },
        },
        tabBarIcon: ({ focused, color, size }) => {
          const [outline, filled] = TAB_ICONS[route.name] ?? ["ellipse-outline", "ellipse"];
          return <Ionicons name={focused ? filled : outline} size={size ?? 22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Alerts" component={AlertsScreen} />
      <Tab.Screen name="Wishlist" component={WishlistScreen} />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.green,
            color: colors.white,
            fontFamily: fonts.bold,
            fontSize: 10,
          },
        }}
      />
      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  );
}
