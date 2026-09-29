import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { Meal } from '@/lib/api';
import { candidateLabel, paymentLabels, yen } from '@/lib/format';
import { colors } from '@/constants/colors';
import { common } from './screen';
export function MealCard({ meal }: { meal: Meal }) {
  const remaining = Math.max(0, meal.maxParticipants - meal.acceptedParticipants);
  return <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/meals/[id]', params: { id: meal.id } })} style={({ pressed }) => [common.card, pressed && styles.pressed]}>
    <View style={common.row}><Text style={styles.avatar}>{meal.host.displayName.slice(0, 1)}</Text><View><Text style={styles.host}>{meal.host.displayName}</Text>{meal.host.twitterUsername && <Text style={common.muted}>@{meal.host.twitterUsername}</Text>}</View></View>
    {remaining === 1 && <Text style={styles.last}>🔥 あと1人で飯決定！</Text>}<Text style={common.cardTitle}>{meal.title}</Text><View style={common.row}>{meal.purposes.slice(0, 3).map(item => <Text style={common.tag} key={item.id}>{item.label}</Text>)}</View><Text style={common.muted} numberOfLines={2}>{meal.description || '気軽に、一緒に飯いこう。'}</Text>
    <Text style={styles.fact}>📍 {meal.area}{meal.restaurant ? ` / ${meal.restaurant}` : ''}</Text><Text style={styles.fact}>🗓 {candidateLabel(meal.candidate)}</Text><Text style={styles.fact}>👥 {meal.acceptedParticipants} / {meal.maxParticipants}人</Text><View style={styles.bottom}><Text style={styles.price}>{yen(meal.budgetMin)}〜{yen(meal.budgetMax)}</Text><Text style={styles.link}>詳細を見る →</Text></View><Text style={common.muted}>{paymentLabels[meal.paymentType]}・1人あたり</Text>
  </Pressable>;
}
const styles = StyleSheet.create({ pressed: { opacity: 0.75 }, avatar: { width: 40, height: 40, borderRadius: 20, textAlign: 'center', lineHeight: 40, backgroundColor: colors.orangeSoft, color: colors.orange, fontWeight: '900' }, host: { color: colors.ink, fontWeight: '800' }, last: { color: colors.orange, fontWeight: '800' }, fact: { color: colors.ink, fontSize: 14 }, bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, price: { color: colors.ink, fontWeight: '900' }, link: { color: colors.orange, fontWeight: '800' } });
