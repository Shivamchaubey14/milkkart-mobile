import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "../../components/Screen";
import type { AdminStackParamList } from "../../navigation/AdminStack";
import { colors, fonts, fontsAlt, spacing } from "../../theme";

export default function AdminPlaceholderScreen() {
  const navigation = useNavigation();
  const { title } = useRoute<RouteProp<AdminStackParamList, "AdminSection">>().params;

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <View style={styles.blob} />
        <View style={styles.headerRow}>
          <Pressable style={styles.back} onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="arrow-back" size={20} color={colors.white} />
          </Pressable>
          <Text style={styles.headerTitle}>{title}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.badge}>
          <Ionicons name="construct-outline" size={34} color={colors.green} />
        </View>
        <Text style={styles.title}>{title} — coming soon</Text>
        <Text style={styles.sub}>
          This back-office section is being built for the app. For now, manage {title.toLowerCase()} from the web admin
          console.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.heading,
    borderRadius: 26,
    marginHorizontal: spacing(2.5),
    marginTop: spacing(1),
    paddingHorizontal: spacing(2.5),
    paddingTop: spacing(2.5),
    paddingBottom: spacing(2.5),
    overflow: "hidden",
  },
  blob: { position: "absolute", top: -45, right: -30, width: 150, height: 150, borderRadius: 75, backgroundColor: "rgba(255,255,255,0.06)" },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing(1.5) },
  back: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: fonts.bold, fontSize: 22, color: colors.white },

  body: { alignItems: "center", paddingHorizontal: spacing(4), paddingTop: spacing(8) },
  badge: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.greenTint, alignItems: "center", justifyContent: "center", marginBottom: spacing(2.5) },
  title: { fontFamily: fonts.bold, fontSize: 18, color: colors.heading, textAlign: "center" },
  sub: { fontFamily: fontsAlt.regular, fontSize: 14, color: colors.muted, textAlign: "center", lineHeight: 21, marginTop: spacing(1.5) },
});
