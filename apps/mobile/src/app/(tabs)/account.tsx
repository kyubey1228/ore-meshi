import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { WEB_URL, type AuthUser } from '@/lib/api';
import { loadMobileUser, signInToMobile, signOutFromMobile } from '@/lib/auth';
import { Screen, common } from '@/components/screen';
import { colors } from '@/constants/colors';

export default function AccountScreen() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { loadMobileUser().then(setUser).catch(() => setError('ログイン情報を確認できませんでした。')).finally(() => setLoading(false)); }, []);
  const login = useCallback(async () => { setBusy(true); setError(null); try { setUser(await signInToMobile()); } catch (value) { setError(value instanceof Error ? value.message : 'ログインできませんでした。'); } finally { setBusy(false); } }, []);
  const logout = useCallback(async () => { setBusy(true); await signOutFromMobile(); setUser(null); setBusy(false); }, []);
  return <Screen><Text style={common.eyebrow}>YOUR ORE-MESHI</Text><Text style={common.title}>マイページ</Text>
    {loading ? <ActivityIndicator color={colors.orange} /> : user ? <View style={common.card}><View style={styles.profile}><Text style={styles.avatar}>{user.displayName.slice(0, 1)}</Text><View><Text style={common.cardTitle}>{user.displayName}</Text><Text style={common.muted}>@{user.twitterUsername}</Text></View></View>{!!user.bio && <Text style={common.muted}>{user.bio}</Text>}<Pressable style={common.primary} onPress={() => Linking.openURL(`${WEB_URL}/mypage`)}><Text style={common.primaryText}>Webマイページを開く</Text></Pressable><Pressable disabled={busy} onPress={logout}><Text style={styles.logout}>{busy ? '処理中…' : 'ログアウト'}</Text></Pressable></View>
      : <View style={common.card}><Text style={common.cardTitle}>Xでログイン</Text><Text style={common.muted}>Xで本人確認後、自動的にアプリへ戻ります。</Text><Pressable disabled={busy} style={[common.primary, busy && styles.disabled]} onPress={login}><Text style={common.primaryText}>{busy ? 'Xへ移動中…' : '𝕏  Xでログイン'}</Text></Pressable></View>}
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}<Pressable style={common.secondary} onPress={() => Linking.openURL(`${WEB_URL}/privacy`)}><Text style={common.secondaryText}>プライバシーポリシー</Text></Pressable>
  </Screen>;
}

const styles = StyleSheet.create({ profile: { flexDirection: 'row', alignItems: 'center', gap: 12 }, avatar: { width: 52, height: 52, borderRadius: 26, textAlign: 'center', lineHeight: 52, backgroundColor: colors.orangeSoft, color: colors.orange, fontSize: 20, fontWeight: '900' }, logout: { color: colors.danger, textAlign: 'center', padding: 12, fontWeight: '700' }, disabled: { opacity: 0.6 }, error: { color: colors.danger, backgroundColor: '#fff0ef', padding: 12, borderRadius: 10 } });
