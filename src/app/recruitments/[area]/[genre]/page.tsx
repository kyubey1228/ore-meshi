import type { Metadata } from 'next';
import Link from 'next/link';
import { getGenreSeoData } from '@/server/genre-seo';
import { MealCard } from '@/components/meal-card';
import { GrowthTracker, TrackedLink } from '@/components/growth-tracker';
import { appUrl } from '@/lib/social';

type Props = { params: Promise<{ area: string; genre: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const raw = await params; const area = decodeURIComponent(raw.area); const genre = decodeURIComponent(raw.genre);
  const data = await getGenreSeoData(area, genre); const canonical = `${appUrl()}/recruitments/${encodeURIComponent(area)}/${encodeURIComponent(genre)}`;
  return { title: `${area}で${genre}に行く人を募集`, description: `${area}の${genre}募集、需要、成立実績を確認して、一緒に食べる人を探せます。`, alternates: { canonical }, robots: data.indexable ? { index: true, follow: true } : { index: false, follow: true }, openGraph: { title: `${area}で${genre}に行く人を募集`, description: `現在${data.meals.length}件募集中。`, url: canonical } };
}
export default async function GenreLanding({ params }: Props) {
  const raw = await params; const area = decodeURIComponent(raw.area); const genre = decodeURIComponent(raw.genre); const data = await getGenreSeoData(area, genre);
  const canonical = `${appUrl()}/recruitments/${encodeURIComponent(area)}/${encodeURIComponent(genre)}`;
  const breadcrumb = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: '飯募集', item: `${appUrl()}/meals` }, { '@type': 'ListItem', position: 2, name: area, item: `${appUrl()}/recruitments/${encodeURIComponent(area)}` }, { '@type': 'ListItem', position: 3, name: genre, item: canonical }] };
  return <section className="section"><GrowthTracker eventType="SEO_LANDING_VIEWED" area={area} foodCategory={genre}/><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb).replace(/</g, '\\u003c') }}/><nav className="muted"><Link href="/meals">飯募集</Link> / <Link href={`/recruitments/${encodeURIComponent(area)}`}>{area}</Link> / {genre}</nav><div className="section-heading"><div><span className="eyebrow orange">{area} × {genre}</span><h1>{area}で{genre}に行く人を募集</h1><p>今の募集と、匿名集計した地域の需要・成立実績です。</p></div><TrackedLink className="btn" eventType="RECRUITMENT_CREATE_CLICKED" payload={{ area, foodCategory: genre, source: 'genre_seo' }} href={`/meals/new?area=${encodeURIComponent(area)}&genre=${encodeURIComponent(genre)}`}>この条件で募集する</TrackedLink></div><div className="analytics-grid"><div><strong>{data.meals.length}</strong><span>現在の募集</span></div>{data.demand30d>=3&&<div><strong>{data.demand30d}</strong><span>30日間の需要</span></div>}{data.completed30d>=3&&<div><strong>{data.completed30d}</strong><span>30日間の開催実績</span></div>}{data.popularHour!==null&&<div><strong>{data.popularHour}時</strong><span>募集が多い時間</span></div>}</div>{data.meals.length?<div className="meal-grid">{data.meals.map(meal=><MealCard key={meal.id} meal={meal}/>)}</div>:<div className="empty"><span className="empty-icon">🍚</span><p>現在募集中の{genre}はありません。</p><Link className="btn" href={`/meals/new?area=${encodeURIComponent(area)}&genre=${encodeURIComponent(genre)}`}>最初の募集を作る</Link></div>}<div className="two-col"><div><h2>関連ジャンル</h2>{data.relatedGenres.map(value=><Link className="tag-pill" key={value} href={`/recruitments/${encodeURIComponent(area)}/${encodeURIComponent(value)}`}>{value}</Link>)}</div><div><h2>近くで探す</h2>{data.nearbyAreas.map(value=><Link className="list-card" key={value.area} href={`/recruitments/${encodeURIComponent(value.area)}/${encodeURIComponent(genre)}`}>{value.area}（{value.count}件）</Link>)}</div></div></section>;
}
