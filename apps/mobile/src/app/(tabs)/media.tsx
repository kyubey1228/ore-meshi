import { useCallback } from 'react';
import { Pressable, RefreshControl, Text } from 'react-native';
import { router } from 'expo-router';
import { api } from '@/lib/api';
import { dateLabel } from '@/lib/format';
import { useApi } from '@/hooks/use-api';
import { RemoteImage } from '@/components/remote-image';
import { ErrorState, Loading, Screen, common } from '@/components/screen';
import { colors } from '@/constants/colors';

export default function MediaScreen() {
  const loader = useCallback((signal: AbortSignal) => api.articles(signal), []); const { data, error, refreshing, refresh } = useApi(loader, [loader]);
  if (!data && refreshing) return <Loading />; if (!data && error) return <ErrorState message={error} retry={refresh} />;
  return <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.orange} />}><Text style={common.eyebrow}>俺メシ MEDIA</Text><Text style={common.title}>ご飯友達を見つけるヒント</Text><Text style={common.subtitle}>探し方、安全対策、地域の情報をまとめています。</Text>
    {data?.items.map(article => <Pressable key={article.id} style={common.card} onPress={() => router.push({ pathname: '/media/[slug]', params: { slug: article.slug } })}><RemoteImage uri={article.coverImage} height={170} />{article.category && <Text style={common.tag}>{article.category.name}</Text>}<Text style={common.cardTitle}>{article.title}</Text><Text style={common.muted} numberOfLines={3}>{article.description}</Text><Text style={common.muted}>{dateLabel(article.publishedAt)} ・ 約{article.readingTime}分</Text></Pressable>)}
  </Screen>;
}
