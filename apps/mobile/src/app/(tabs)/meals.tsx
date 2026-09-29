import { useCallback, useState } from 'react';
import { Linking, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { api, WEB_URL } from '@/lib/api';
import { useApi } from '@/hooks/use-api';
import { MealCard } from '@/components/meal-card';
import { ErrorState, Loading, Screen, common } from '@/components/screen';
import { colors } from '@/constants/colors';

export default function MealsScreen() {
  const [query, setQuery] = useState(''); const [area, setArea] = useState('');
  const loader = useCallback((signal: AbortSignal) => api.meals(area, signal), [area]);
  const { data, error, refreshing, refresh } = useApi(loader, [loader]);
  if (!data && refreshing) return <Loading />;
  if (!data && error) return <ErrorState message={error} retry={refresh} />;
  return <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.orange} />}>
    <Text style={common.eyebrow}>FIND YOUR NEXT MEAL</Text><Text style={common.title}>誰かの飯に乗っかる。</Text><Text style={common.subtitle}>今日の「うまい」を、一緒に。</Text>
    <View style={styles.search}><TextInput value={query} onChangeText={setQuery} placeholder="エリアで探す（例：渋谷）" placeholderTextColor={colors.muted} returnKeyType="search" onSubmitEditing={() => setArea(query.trim())} style={styles.input} /><Pressable style={styles.searchButton} onPress={() => setArea(query.trim())}><Text style={styles.searchText}>検索</Text></Pressable></View>
    {area && <Pressable onPress={() => { setQuery(''); setArea(''); }}><Text style={styles.clear}>「{area}」を解除 ×</Text></Pressable>}
    <Pressable style={common.primary} onPress={() => Linking.openURL(`${WEB_URL}/meals/new`)}><Text style={common.primaryText}>飯相手を募集する</Text></Pressable>
    <Text style={common.muted}>{data?.items.length ?? 0}件の飯</Text>{data?.items.map(meal => <MealCard key={meal.id} meal={meal} />)}
    {!data?.items.length && <View style={common.card}><Text style={common.cardTitle}>募集中の飯がありません</Text><Text style={common.muted}>条件を変えるか、自分で募集してみよう。</Text></View>}
  </Screen>;
}
const styles = StyleSheet.create({ search: { flexDirection: 'row', gap: 8 }, input: { flex: 1, minHeight: 48, backgroundColor: colors.paper, borderColor: colors.border, borderWidth: 1, borderRadius: 13, paddingHorizontal: 14, color: colors.ink }, searchButton: { minWidth: 64, borderRadius: 13, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }, searchText: { color: '#fff', fontWeight: '800' }, clear: { color: colors.orange, fontWeight: '700' } });
