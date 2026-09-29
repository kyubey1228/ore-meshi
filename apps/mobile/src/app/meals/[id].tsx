import { useCallback } from 'react';
import { Linking, Pressable, RefreshControl, Share, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { api, WEB_URL } from '@/lib/api';
import { candidateLabel, paymentLabels, yen } from '@/lib/format';
import { useApi } from '@/hooks/use-api';
import { ErrorState, Loading, Screen, common } from '@/components/screen';
import { colors } from '@/constants/colors';

export default function MealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const loader = useCallback((signal: AbortSignal) => api.meal(id, signal), [id]); const { data, error, refreshing, refresh } = useApi(loader, [loader]);
  if (!data && refreshing) return <Loading />; if (!data && error) return <ErrorState message={error} retry={refresh} />; if (!data) return null;
  const { item: meal } = data; const webUrl = `${WEB_URL}/meals/${encodeURIComponent(meal.id)}`; const remaining = Math.max(0, meal.maxParticipants - meal.acceptedParticipants);
  return <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.orange} />}>
    {meal.sponsor && <Text style={styles.sponsor}>PR・{meal.sponsor.sponsorName} {meal.sponsor.benefit}</Text>}{remaining === 1 && <Text style={styles.last}>🔥 あと1人で飯決定！</Text>}<Text style={common.title}>{meal.title}</Text><View style={common.row}>{meal.purposes.map(item => <Text style={common.tag} key={item.id}>{item.label}</Text>)}</View>
    <View style={[common.card, styles.host]}><Text style={styles.avatar}>{meal.host.displayName.slice(0, 1)}</Text><View><Text style={common.cardTitle}>{meal.host.displayName}</Text>{meal.host.twitterUsername && <Text style={common.muted}>@{meal.host.twitterUsername}</Text>}</View></View>
    {!!meal.description && <Text style={styles.description}>{meal.description}</Text>}
    <View style={common.card}><Fact label="どこ" value={`${meal.area}${meal.restaurant ? ` / ${meal.restaurant}` : ''}`} /><Fact label="いつ" value={(meal.candidates ?? []).map(candidateLabel).join('\n') || '日程調整中'} /><Fact label="いくら" value={`${yen(meal.budgetMin)}〜${yen(meal.budgetMax)} / 人`} /><Fact label="お会計" value={paymentLabels[meal.paymentType]} /><Fact label="何人" value={`${meal.acceptedParticipants} / ${meal.maxParticipants}人（募集者含む）`} /><Fact label="残り" value={`あと${remaining}人`} />{meal.genre && <Fact label="ジャンル" value={meal.genre} />}{meal.alcohol && <Fact label="お酒" value={meal.alcohol} />}{meal.smoking && <Fact label="たばこ" value={meal.smoking} />}</View>
    <Pressable style={common.primary} onPress={() => Linking.openURL(`${webUrl}#join-panel`)}><Text style={common.primaryText}>この募集に参加する</Text></Pressable><Text style={common.muted}>参加申請はXログイン対応のWeb画面で完了します。</Text>
    <Pressable style={common.secondary} onPress={() => Share.share({ title: meal.title, message: `${meal.title}\n${webUrl}`, url: webUrl })}><Text style={common.secondaryText}>この募集をシェア</Text></Pressable>
  </Screen>;
}
function Fact({ label, value }: { label: string; value: string }) { return <View style={styles.fact}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>; }
const styles = StyleSheet.create({ sponsor: { color: colors.green, fontWeight: '800' }, last: { color: colors.orange, fontWeight: '900' }, host: { flexDirection: 'row', alignItems: 'center' }, avatar: { width: 48, height: 48, borderRadius: 24, textAlign: 'center', lineHeight: 48, backgroundColor: colors.orangeSoft, color: colors.orange, fontWeight: '900', fontSize: 18 }, description: { color: colors.ink, fontSize: 16, lineHeight: 26 }, fact: { paddingVertical: 8, borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, gap: 4 }, label: { color: colors.muted, fontSize: 12, fontWeight: '700' }, value: { color: colors.ink, fontSize: 16, lineHeight: 24 } });
