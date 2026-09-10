import type { Metadata } from 'next';
import Link from 'next/link';
import { getMealList } from '@/lib/data';
import { currentUserId } from '@/server/auth';
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
  const [meals, userId] = await Promise.all([getMealList({ area: decoded }), currentUserId()]);
  const createHref = userId ? '/meals/new' : `/login?next=${encodeURIComponent('/meals/new')}`;

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
