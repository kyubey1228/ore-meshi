import type { Metadata } from 'next';
import Link from 'next/link';
import { getMealList } from '@/lib/data';
import { currentUserId } from '@/server/auth';
import { getAreaStats } from '@/server/area-stats';
import { MealCard } from '@/components/meal-card';
import { TrackedLink } from '@/components/growth-tracker';
import { appUrl } from '@/lib/social';

type Props = { params: Promise<{ area: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { area } = await params;
  const decoded = decodeURIComponent(area);
  const title = `${decoded}で誰かと飯を食う`;
  const description = `${decoded}エリアの飯募集一覧。「俺は誰かと飯が食いたい！」で今すぐ参加できる募集を探そう。`;
  return { title, description, alternates: { canonical: `${appUrl()}/recruitments/${area}` } };
}

export default async function RecruitmentsByArea({ params }: Props) {
  const { area } = await params;
  const decoded = decodeURIComponent(area);
  const [meals, userId, stats] = await Promise.all([getMealList({ area: decoded }), currentUserId(), getAreaStats(decoded)]);
  const createHref = userId ? '/meals/new' : `/login?next=${encodeURIComponent('/meals/new')}`;
  const hasMeaningfulStats = stats.completedMeals30d >= 2 || stats.activeMeals >= 2;

  return (
    <section className="section">
      <div className="section-heading">
        <div>
          <span className="eyebrow orange">{decoded.toUpperCase()}</span>
          <h1>{decoded}で誰かと飯を食う</h1>
          <p className="muted">{decoded}エリアの飯募集一覧。</p>
        </div>
        <TrackedLink className="btn secondary" eventType="RECRUITMENT_CREATE_CLICKED" payload={{ area: decoded, loggedIn: Boolean(userId), source: 'area_landing' }} href={createHref}>飯相手を募集する</TrackedLink>
      </div>
      {hasMeaningfulStats && (
        <div className="analytics-grid">
          <div><strong>{stats.activeMeals}</strong><span>現在募集中</span></div>
          <div><strong>{stats.completedMeals30d}</strong><span>過去30日の成立数</span></div>
          {stats.participantsThisWeek > 0 && <div><strong>{stats.participantsThisWeek}</strong><span>今週の参加予定人数</span></div>}
        </div>
      )}
      {meals.length ? (
        <div className="meal-grid">{meals.map(meal => <MealCard key={meal.id} meal={meal} />)}</div>
      ) : (
        <div className="empty">
          <span className="empty-icon">🍚</span>
          <p>{decoded}ではまだ募集がありません。<br />最初の募集を作ってみませんか？</p>
          <TrackedLink className="btn" eventType="RECRUITMENT_CREATE_CLICKED" payload={{ area: decoded, loggedIn: Boolean(userId), source: 'area_landing_empty' }} href={createHref}>募集を作る →</TrackedLink>
        </div>
      )}
      <Link className="text-link" href="/meals">すべてのエリアから探す →</Link>
    </section>
  );
}
