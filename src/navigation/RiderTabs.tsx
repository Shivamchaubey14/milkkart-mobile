import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useUnreadCountQuery } from "../api/baseApi";
import { useT } from "../i18n/LanguageProvider";
import NotificationsScreen from "../screens/NotificationsScreen";
import PlaceholderScreen from "../screens/PlaceholderScreen";
import ProfileStack from "./ProfileStack";
import RiderHomeStack from "./RiderHomeStack";
import { colors, fonts, palette } from "../theme";

const Tab = createBottomTabNavigator();

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const TAB_ICONS: Record<string, [IoniconName, IoniconName]> = {
  Home: ["home-outline", "home"],
  Pending: ["time-outline", "time"],
  Alerts: ["notifications-outline", "notifications"],
  Earnings: ["wallet-outline", "wallet"],
  Profile: ["person-outline", "person"],
};

// Placeholder tabs until their features land — kept as named components so the
// tab labels/headers read correctly.
const PendingTab = () => {
  const t = useT();
  return <PlaceholderScreen title={t("placeholderPending")} icon="time-outline" />;
};
const EarningsTab = () => {
  const t = useT();
  return <PlaceholderScreen title={t("placeholderEarnings")} icon="wallet-outline" />;
};

// Bottom tabs shown to delivery partners (is_rider). Same Cream-Yolk bar as the
// customer app, but a rider-focused set: Home dashboard, Pending, Earnings, Profile.
export default function RiderTabs() {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 8);
  const t = useT();
  const { data: unread } = useUnreadCountQuery();
  const unreadCount = unread?.unread_count ?? 0;
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
      <Tab.Screen name="Home" component={RiderHomeStack} options={{ tabBarLabel: t("tabHome") }} />
      <Tab.Screen name="Pending" component={PendingTab} options={{ tabBarLabel: t("tabPending") }} />
      <Tab.Screen
        name="Alerts"
        component={NotificationsScreen}
        options={{
          tabBarLabel: t("tabAlerts"),
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.green,
            color: colors.white,
            fontFamily: fonts.bold,
            fontSize: 10,
          },
        }}
      />
      <Tab.Screen name="Earnings" component={EarningsTab} options={{ tabBarLabel: t("tabEarnings") }} />
      <Tab.Screen name="Profile" component={ProfileStack} options={{ tabBarLabel: t("tabProfile") }} />
    </Tab.Navigator>
  );
}
