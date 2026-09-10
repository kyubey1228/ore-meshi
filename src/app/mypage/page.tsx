import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getFavoriteMealIds, getMealsByIds, getMyPageData, getReferralStats } from '@/lib/data';
import { getOrCreateReferralCode } from '@/server/referral';
import { currentUserId } from '@/server/auth';
import { appUrl } from '@/lib/social';
import { dateTimeLabel, mealStatusLabels, matchStatusLabels, paymentLabels, requestStatusLabels } from '@/lib/format';
import { LogoutButton } from '@/components/auth-buttons';
import { UserAvatar, MealCard } from '@/components/meal-card';
import { ReferralShare } from '@/components/referral-share';

export const metadata = { title: 'マイページ' };
export default async function MyPage() {
  // userIdはセッションから即座に分かる(currentUserIdはリクエスト単位でキャッシュされ重複コストなし)ため、
  // getMyPageData()の重いクエリ群を待たずに、お気に入り/紹介コード/紹介実績の取得も同時に始める
  // (以前はgetMyPageData()完了→お気に入り取得開始、という2段階のwaterfallになっていた)。
  const userId = await currentUserId();
  if (!userId) redirect('/login?next=%2Fmypage');
  const [data, favoriteIds, referralCode, referralStats] = await Promise.all([
    getMyPageData(userId),
    getFavoriteMealIds(userId),
    getOrCreateReferralCode(userId),
    getReferralStats(userId),
  ]);
  if (!data.onboardingCompletedAt) redirect('/onboarding');
  const upcoming = data.matches.filter(m => m.status === 'ACTIVE');
  const lastHostedMeal = data.hostedMeals[0] ?? null;
  const favoriteMeals = favoriteIds.length ? await getMealsByIds(favoriteIds) : [];
  // まだ人数が集まっていない(＝成立していない)自分の募集があるかどうか。招待CTAの文脈判定に使う。
  const hasUnfilledMeal = data.hostedMeals.some(meal => meal.status === 'OPEN');

  return <section className="section"><div className="section-heading"><div><span className="eyebrow orange">MY TABLE</span><h1>マイページ</h1></div><div className="row">{data.businessMembership&&<Link className="text-link" href="/business/dashboard">{data.businessMembership.businessAccount.name}の店舗管理</Link>}{data.isAdmin&&<Link className="btn secondary small" href="/admin/leads">管理者ダッシュボード</Link>}<Link className="text-link" href="/profile">プロフィール編集</Link><LogoutButton /></div></div>
    <div className="dashboard-grid">
      <section className="panel"><h2>自分の募集</h2>{data.hostedMeals.length ? data.hostedMeals.map(meal => <Link className="list-card" href={`/meals/${meal.id}`} key={meal.id}><strong>{meal.title}</strong><span>{mealStatusLabels[meal.status]} · {meal._count.joinRequests + 1}/{meal.maxParticipants}人</span></Link>) : <p className="muted">まだ飯を募集していない。</p>}<Link className="btn" href="/meals/new">飯を募集する</Link></section>
      <section className="panel"><h2>参加申請中</h2>{data.joinRequests.length ? data.joinRequests.map(request => <Link className="list-card" href={`/meals/${request.mealId}`} key={request.id}><strong>{request.meal.title}</strong><span>{requestStatusLabels[request.status]} · {request.candidate.startTime}〜</span></Link>) : <p className="muted">返事待ちの飯はありません。</p>}</section>
      <section className="panel"><h2>参加予定</h2>{upcoming.length ? upcoming.map(match => <Link className="list-card" href={`/matches/${match.id}`} key={match.id}><strong>{match.meal.title}</strong><span>{dateTimeLabel(match.scheduledAt)} · {matchStatusLabels[match.status]}</span></Link>) : <p className="muted">今のところ飯の予定なし。</p>}</section>
      <section className="panel"><h2>飲食歴</h2>{data.completedMatches.length ? data.completedMatches.slice(0,5).map(match => <Link className="history-card" href={`/matches/${match.id}`} key={match.id}><strong>{dateTimeLabel(match.scheduledAt)}</strong><span>{match.meal.title} · {match.meal.area}</span><span>{paymentLabels[match.meal.paymentType]} · {match.participants.length}人</span><div className="avatar-stack">{match.participants.map(({user}) => <UserAvatar key={user.id} user={user} />)}</div></Link>) : <p className="muted">まだ誰とも飯を食ってない。</p>}<Link className="text-link" href="/history">飲食歴をすべて見る →</Link></section>
    </div>
    {lastHostedMeal && <div className="panel">
      <h2>また同じ感じで探す？</h2>
      <p className="muted">前回：{lastHostedMeal.area} × {lastHostedMeal.genre ?? 'ジャンルこだわらない'}</p>
      <div className="row wrap">
        <Link className="btn" href={`/meals/new?repeat=${lastHostedMeal.id}`}>同じ条件でまた募集する</Link>
        <Link className="btn secondary" href={`/meals?area=${encodeURIComponent(lastHostedMeal.area)}`}>前回と似た募集を探す</Link>
      </div>
    </div>}
    {favoriteMeals.length > 0 && <>
      <div className="section-heading"><h2>あとで見る</h2></div>
      <div className="meal-grid">{favoriteMeals.map(meal => <MealCard key={meal.id} meal={meal} />)}</div>
    </>}
    {referralStats.invitedCount > 0 && (
      <div className="panel">
        <h2>招待実績</h2>
        <dl className="stats">
          <div><dt>招待</dt><dd>{referralStats.invitedCount}人</dd></div>
          <div><dt>登録</dt><dd>{referralStats.signupCount}人</dd></div>
          <div><dt>Activated</dt><dd>{referralStats.activatedCount}人</dd></div>
          <div><dt>紹介経由の成立</dt><dd>{referralStats.referredMatchCount}件</dd></div>
        </dl>
      </div>
    )}
    {hasUnfilledMeal && <p className="notice">まだ人数が集まっていない募集があります。友達を誘うと成立しやすくなります。</p>}
    <ReferralShare inviteUrl={`${appUrl()}/invite/${referralCode}`} text={`「俺は誰かと飯が食いたい！」使ってみない？\n\n${appUrl()}/invite/${referralCode}`} />
  </section>;
}
