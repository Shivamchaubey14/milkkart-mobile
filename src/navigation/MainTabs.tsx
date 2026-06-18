import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import HomeScreen from "../screens/HomeScreen";
import PlaceholderScreen from "../screens/PlaceholderScreen";
import ProfileScreen from "../screens/ProfileScreen";
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
      <Tab.Screen name="Cart" component={CartScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
