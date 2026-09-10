import { LoginButton } from '@/components/auth-buttons';
import { authConfigured } from '@/server/auth';

export const metadata = { title: '店舗・企業の方はこちら' };

export default async function BusinessLogin({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next } = await searchParams;
  const callbackUrl = next && next.startsWith('/business') ? next : '/business/onboarding';
  return (
    <section className="narrow section center">
      <span className="empty-icon">🏪</span>
      <h1 className="login-title">店舗・企業の登録をはじめよう。</h1>
      <p>Twitter/Xでログインして、お店・企業の情報を登録しよう。</p>
      <LoginButton disabled={!authConfigured} callbackUrl={callbackUrl} />
      {!authConfigured && <p className="notice">ただいまログインの準備中です。</p>}
      {error && <p role="alert" className="error">ログインできませんでした。もう一度お試しください。</p>}
      <p className="muted">許可なく投稿することはありません。<br />Xの表示名・ユーザー名・プロフィール画像を利用します。</p>
    </section>
  );
}
