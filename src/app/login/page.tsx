import { LoginButton } from '@/components/auth-buttons';
import { authConfigured } from '@/server/auth';
import { GrowthTracker } from '@/components/growth-tracker';

function safeNext(next?: string) {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return undefined;
  return next;
}

function intentFrom(next?: string): 'join' | 'create' | undefined {
  if (!next) return undefined;
  if (next.startsWith('/meals/new')) return 'create';
  if (/^\/meals\/[^/]+/.test(next)) return 'join';
  return undefined;
}

const COPY = {
  join: { icon: '🍚', title: 'あと少しで参加できます。', body: 'Twitter/Xでログインして、この募集への参加を確定しよう。' },
  create: { icon: '📣', title: '飯相手を募集しよう。', body: 'Twitter/Xでログインして、募集を作ろう。' },
  default: { icon: '🍚', title: 'まずは、顔見知りになろう。', body: 'Twitter/Xでログインして、飯の仲間を見つけよう。' },
} as const;

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next: rawNext } = await searchParams;
  const next = safeNext(rawNext);
  const intent = intentFrom(next);
  const copy = COPY[intent ?? 'default'];
  return (
    <section className="narrow section center">
      <GrowthTracker eventType="SIGNUP_STARTED" loggedIn={false} source={intent} />
      <span className="empty-icon">{copy.icon}</span>
      <h1 className="login-title">{copy.title}</h1>
      <p>{copy.body}</p>
      <LoginButton disabled={!authConfigured} callbackUrl={next ?? '/mypage'} />
      {!authConfigured && <p className="notice">ただいまログインの準備中です。公開中の募集はログインせずに見られます。</p>}
      {error && <p role="alert" className="error">ログインできませんでした。もう一度お試しください。</p>}
      <p className="muted">許可なく投稿することはありません。<br />Xの表示名・ユーザー名・プロフィール画像を利用します。</p>
    </section>
  );
}
