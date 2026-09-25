import type { Metadata } from 'next';
import Link from 'next/link';
import { getMealList } from '@/lib/data';
import { currentUserId } from '@/server/auth';
import { getAreaStats } from '@/server/area-stats';
import { MealCard } from '@/components/meal-card';
import { TrackedLink } from '@/components/growth-tracker';
import { appUrl } from '@/lib/social';
import { getArticlesForLanding } from '@/server/media';
import { GrowthTracker } from '@/components/growth-tracker';

type Props = { params: Promise<{ area: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { area } = await params;
  const decoded = decodeURIComponent(area);
  const title = `${decoded}で食事相手・ご飯仲間を募集`;
  const description = `${decoded}で一緒にご飯へ行く人を探せます。ランチ、焼肉、居酒屋、飲みなど現在募集中の食事募集を掲載。`;
  const canonical = `${appUrl()}/recruitments/${encodeURIComponent(decoded)}`;
  return { title, description, alternates: { canonical }, openGraph: { title, description, url: canonical } };
}

export default async function RecruitmentsByArea({ params }: Props) {
  const { area } = await params;
  const decoded = decodeURIComponent(area);
  const [meals, userId, stats, articles] = await Promise.all([getMealList({ area: decoded }), currentUserId(), getAreaStats(decoded), getArticlesForLanding(decoded)]);
  const createHref = userId ? '/meals/new' : `/login?next=${encodeURIComponent('/meals/new')}`;
  const hasMeaningfulStats = stats.completedMeals30d >= 2 || stats.activeMeals >= 2;

  return (
    <section className="section"><GrowthTracker eventType="SEO_AREA_VIEW" area={decoded} source="area_seo" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'ホーム', item: appUrl() }, { '@type': 'ListItem', position: 2, name: '食事相手募集', item: `${appUrl()}/meals` }, { '@type': 'ListItem', position: 3, name: decoded, item: `${appUrl()}/recruitments/${encodeURIComponent(decoded)}` }] }).replace(/</g, '\\u003c') }} />
      <nav className="breadcrumbs"><Link href="/">ホーム</Link> / <Link href="/meals">食事相手募集</Link> / {decoded}</nav>
      <div className="section-heading">
        <div>
          <span className="eyebrow orange">{decoded.toUpperCase()}</span>
          <h1>{decoded}で食事相手・ご飯仲間を募集</h1>
          <p className="muted">{decoded}でランチ、焼肉、居酒屋、飲みなど、一緒にご飯へ行ける人を探せます。</p>
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
      {articles.length > 0 && <div className="panel"><h2>{decoded}で食事相手を探すヒント</h2>{articles.map(article => <Link className="list-card" key={article.slug} href={`/media/${article.slug}`}><strong>{article.title}</strong><span>{article.excerpt}</span></Link>)}</div>}
      <Link className="text-link" href="/meals">すべてのエリアから探す →</Link>
    </section>
  );
}
