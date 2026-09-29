import { useCallback } from 'react';
import { Linking, Pressable, RefreshControl, Share, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { api, WEB_URL } from '@/lib/api';
import { dateLabel } from '@/lib/format';
import { useApi } from '@/hooks/use-api';
import { RemoteImage } from '@/components/remote-image';
import { ErrorState, Loading, Screen, common } from '@/components/screen';
import { colors } from '@/constants/colors';

export default function ArticleScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>(); const loader = useCallback((signal: AbortSignal) => api.article(slug, signal), [slug]); const { data, error, refreshing, refresh } = useApi(loader, [loader]);
  if (!data && refreshing) return <Loading />; if (!data && error) return <ErrorState message={error} retry={refresh} />; if (!data) return null;
  const { item } = data; const webUrl = `${WEB_URL}/media/${encodeURIComponent(item.slug)}`;
  return <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.orange} />}>
    {item.category && <Text style={common.eyebrow}>{item.category.name}</Text>}<Text style={common.title}>{item.title}</Text><Text style={common.muted}>公開 {dateLabel(item.publishedAt)} ・ {item.author.displayName} ・ 約{item.readingTime}分</Text><Text style={styles.lead}>{item.description}</Text><RemoteImage uri={item.coverImage} height={220} /><Text style={styles.body}>{item.content}</Text>
    <Pressable style={common.secondary} onPress={() => Share.share({ title: item.title, message: `${item.title}\n${webUrl}`, url: webUrl })}><Text style={common.secondaryText}>記事をシェア</Text></Pressable><Pressable style={common.primary} onPress={() => Linking.openURL(`${WEB_URL}/meals`)}><Text style={common.primaryText}>現在の食事相手募集を見る</Text></Pressable><Pressable onPress={() => Linking.openURL(webUrl)}><Text style={styles.web}>Web版の記事を開く →</Text></Pressable>
  </Screen>;
}
const styles = StyleSheet.create({ lead: { color: colors.ink, fontSize: 17, lineHeight: 28, fontWeight: '600' }, body: { color: colors.ink, fontSize: 16, lineHeight: 29 }, web: { color: colors.orange, textAlign: 'center', fontWeight: '800', padding: 10 } });
