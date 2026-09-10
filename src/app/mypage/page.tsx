import Link from 'next/link';
import { getMyPageData } from '@/lib/data';
import { dateTimeLabel, mealStatusLabels, matchStatusLabels, paymentLabels, requestStatusLabels } from '@/lib/format';
import { LogoutButton } from '@/components/auth-buttons';
import { UserAvatar } from '@/components/meal-card';

export const metadata = { title: 'マイページ' };
export default async function MyPage() {
  const data = await getMyPageData();
  const upcoming = data.matches.filter(m => m.status === 'ACTIVE');
  return <section className="section"><div className="section-heading"><div><span className="eyebrow orange">MY TABLE</span><h1>マイページ</h1></div><div className="row">{data.businessMembership&&<Link className="text-link" href="/business/dashboard">{data.businessMembership.businessAccount.name}の店舗管理</Link>}{data.isAdmin&&<Link className="btn secondary small" href="/admin/leads">管理者ダッシュボード</Link>}<Link className="text-link" href="/profile">プロフィール編集</Link><LogoutButton /></div></div>
    <div className="dashboard-grid">
      <section className="panel"><h2>自分の募集</h2>{data.hostedMeals.length ? data.hostedMeals.map(meal => <Link className="list-card" href={`/meals/${meal.id}`} key={meal.id}><strong>{meal.title}</strong><span>{mealStatusLabels[meal.status]} · {meal._count.joinRequests + 1}/{meal.maxParticipants}人</span></Link>) : <p className="muted">まだ飯を募集していない。</p>}<Link className="btn" href="/meals/new">飯を募集する</Link></section>
      <section className="panel"><h2>参加申請中</h2>{data.joinRequests.length ? data.joinRequests.map(request => <Link className="list-card" href={`/meals/${request.mealId}`} key={request.id}><strong>{request.meal.title}</strong><span>{requestStatusLabels[request.status]} · {request.candidate.startTime}〜</span></Link>) : <p className="muted">返事待ちの飯はありません。</p>}</section>
      <section className="panel"><h2>参加予定</h2>{upcoming.length ? upcoming.map(match => <Link className="list-card" href={`/matches/${match.id}`} key={match.id}><strong>{match.meal.title}</strong><span>{dateTimeLabel(match.scheduledAt)} · {matchStatusLabels[match.status]}</span></Link>) : <p className="muted">今のところ飯の予定なし。</p>}</section>
      <section className="panel"><h2>飲食歴</h2>{data.completedMatches.length ? data.completedMatches.slice(0,5).map(match => <Link className="history-card" href={`/matches/${match.id}`} key={match.id}><strong>{dateTimeLabel(match.scheduledAt)}</strong><span>{match.meal.title} · {match.meal.area}</span><span>{paymentLabels[match.meal.paymentType]} · {match.participants.length}人</span><div className="avatar-stack">{match.participants.map(({user}) => <UserAvatar key={user.id} user={user} />)}</div></Link>) : <p className="muted">まだ誰とも飯を食ってない。</p>}<Link className="text-link" href="/history">飲食歴をすべて見る →</Link></section>
    </div>
  </section>;
}
