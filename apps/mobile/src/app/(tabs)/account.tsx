import { Linking, Pressable, Text, View } from 'react-native';
import { WEB_URL } from '@/lib/api';
import { Screen, common } from '@/components/screen';

export default function AccountScreen() {
  return <Screen><Text style={common.eyebrow}>YOUR ORE-MESHI</Text><Text style={common.title}>マイページ</Text><Text style={common.subtitle}>ログイン、参加申請、募集の管理は、安全な既存Web画面で続けられます。</Text>
    <View style={common.card}><Text style={common.cardTitle}>Xでログイン</Text><Text style={common.muted}>ログイン後は、募集への参加・投稿・待ち合わせチャットを利用できます。</Text><Pressable style={common.primary} onPress={() => Linking.openURL(`${WEB_URL}/login?next=${encodeURIComponent('/mypage')}`)}><Text style={common.primaryText}>ログインして開く</Text></Pressable></View>
    <Pressable style={common.secondary} onPress={() => Linking.openURL(`${WEB_URL}/mypage`)}><Text style={common.secondaryText}>Webマイページを開く</Text></Pressable>
    <Pressable style={common.secondary} onPress={() => Linking.openURL(`${WEB_URL}/privacy`)}><Text style={common.secondaryText}>プライバシーポリシー</Text></Pressable>
  </Screen>;
}
