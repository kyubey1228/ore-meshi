import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';
import { colors } from '@/constants/colors';
function TabIcon({ icon, color }: { icon: string; color: ColorValue }) { return <Text style={{ color, fontSize: 20 }}>{icon}</Text>; }
export default function TabsLayout() {
  return <Tabs screenOptions={{ headerStyle: { backgroundColor: colors.paper }, headerTintColor: colors.ink, headerShadowVisible: false, tabBarActiveTintColor: colors.orange, tabBarInactiveTintColor: colors.muted, tabBarStyle: { backgroundColor: colors.paper, borderTopColor: colors.border } }}>
    <Tabs.Screen name="meals" options={{ title: '飯を探す', tabBarIcon: ({ color }) => <TabIcon icon="🍚" color={color} /> }} />
    <Tabs.Screen name="media" options={{ title: 'メディア', tabBarIcon: ({ color }) => <TabIcon icon="📖" color={color} /> }} />
    <Tabs.Screen name="account" options={{ title: 'マイページ', tabBarIcon: ({ color }) => <TabIcon icon="👤" color={color} /> }} />
  </Tabs>;
}
