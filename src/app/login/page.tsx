import { cookies } from 'next/headers';
import { LoginButton } from '@/components/auth-buttons';
import { authConfigured } from '@/server/auth';
import { GrowthTracker } from '@/components/growth-tracker';
import { getMealShareData } from '@/lib/data';
import { candidateLabel } from '@/lib/format';
import { REFERRAL_COOKIE } from '@/server/referral-constants';

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

function mealIdFrom(next?: string) {
  const match = next?.match(/^\/meals\/([^/?]+)/);
  return match?.[1];
}

const COPY = {
  join: { icon: '🍚', title: 'あと少しで参加できます。', body: '登録後すぐ参加できます。' },
  create: { icon: '📣', title: '飯相手を募集しよう。', body: '登録後すぐ募集を作れます。' },
  default: { icon: '🍚', title: 'まずは、顔見知りになろう。', body: 'Twitter/Xでログインして、飯の仲間を見つけよう。' },
} as const;

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const [{ error, next: rawNext }, hasReferral] = await Promise.all([searchParams, (async () => Boolean((await cookies()).get(REFERRAL_COOKIE)?.value))()]);
  const next = safeNext(rawNext);
  const intent = intentFrom(next);
  const copy = COPY[intent ?? 'default'];
  const mealId = intent === 'join' ? mealIdFrom(next) : undefined;
  const meal = mealId ? await getMealShareData(mealId) : null;

  return (
    <section className="narrow section center">
      <GrowthTracker eventType="SIGNUP_STARTED" loggedIn={false} source={intent} />
      {hasReferral && <GrowthTracker eventType="REFERRAL_SIGNUP_STARTED" loggedIn={false} />}
      <span className="empty-icon">{copy.icon}</span>
      <h1 className="login-title">{copy.title}</h1>
      {meal && (
        <div className="notice">
          登録すると「{meal.title}」({meal.area}{meal.candidates[0] ? ` · ${candidateLabel(meal.candidates[0])}` : ''})に戻ります。
        </div>
      )}
      <p>{copy.body}</p>
      <LoginButton disabled={!authConfigured} callbackUrl={next ?? '/mypage'} />
      {!authConfigured && <p className="notice">ただいまログインの準備中です。公開中の募集はログインせずに見られます。</p>}
      {error && <p role="alert" className="error">ログインできませんでした。もう一度お試しください。</p>}
      <p className="muted">許可なく投稿することはありません。<br />Xの表示名・ユーザー名・プロフィール画像を利用します。</p>
    </section>
  );
}
