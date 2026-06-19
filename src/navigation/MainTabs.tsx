import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import HomeScreen from "../screens/HomeScreen";
import PlaceholderScreen from "../screens/PlaceholderScreen";
import ProfileStack from "./ProfileStack";
import { selectCartCount } from "../store/cartSlice";
import { useAppSelector } from "../store/hooks";
import { colors, fonts } from "../theme";

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
const CartScreen = () => <PlaceholderScreen title="Cart" icon="cart-outline" />;

export default function MainTabs() {
  const cartCount = useAppSelector((s) => selectCartCount(s.cart.items));
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
        tabBarStyle: {
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
          borderTopColor: colors.line,
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
