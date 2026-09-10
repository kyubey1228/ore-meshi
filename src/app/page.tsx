import Link from 'next/link';
import { ArrowRight, Utensils, CalendarDays, Handshake } from 'lucide-react';
import { getMealList } from '@/lib/data';
import { MealCard, Empty } from '@/components/meal-card';
import { BusinessRecruitBanner } from '@/components/business-recruit-banner';
import { getPopularAreas } from '@/server/area-stats';
import { getSocialProofHighlight } from '@/server/social-proof';
import { measurePerformance } from '@/lib/performance';
import { HomeLoginHint } from '@/components/auth-nav-state';

export const revalidate = 60;

export default async function Home() {
  const [meals, popularAreas, socialProof] = await measurePerformance('HOME', 'render data', () => Promise.all([getMealList({}, {}, 30), getPopularAreas(5), getSocialProofHighlight()]));
  return <>
    <section className="hero"><div className="hero-copy"><span className="eyebrow"><span className="live-dot" />ひとり飯もいいけど、今日は誰かと。</span><h1>俺は誰かと<br /><span className="underline-orange">飯が食いたい</span><span className="orange">！</span></h1><p className="hero-catch">今日、誰かと飯食わない？</p><p className="muted hero-description">行きたいお店がある。ちょっと誰かと話したい。<br />理由はそれくらいでいい。気軽に、飯の仲間を見つけよう。</p>{socialProof && <p className="muted hero-social-proof">{socialProof.text}</p>}<div className="hero-actions"><Link className="btn" href="/meals/new">飯を募集する <ArrowRight size={18} /></Link><Link className="btn secondary" href="/meals">誰かの飯に乗っかる</Link></div><HomeLoginHint/></div><div className="hero-art" aria-label="お箸とごはん、誰か飯いかん？"><span className="art-note">誰か、飯いかん？</span><div className="art-circle"><span className="rice">🍚</span><span className="chopsticks">🥢</span></div><span className="art-caption">GOOD FOOD, GOOD COMPANY.</span><span className="spark spark-one">✳</span><span className="spark spark-two">✳</span></div></section>
    <section className="how-strip"><p>飯に行くまで、<strong>たった3ステップ。</strong></p>{[{ Icon: Utensils, title: '食べたい飯を見つける' }, { Icon: CalendarDays, title: '「この飯に行く」を送る' }, { Icon: Handshake, title: '飯決定！あとは楽しむだけ' }].map(({ Icon, title }, i) => <div key={title}><span className="step-number">0{i + 1}</span><Icon size={21} /><span>{title}</span></div>)}</section>
    <section className="section"><div className="section-heading"><div><span className="eyebrow orange">LET’S EAT TOGETHER</span><h2>いま、誰かが飯を募集してる。</h2><p className="muted">ピンときたら、気軽に乗っかろう。</p></div><Link className="text-link" href="/meals">すべての飯を見る <ArrowRight size={17} /></Link></div>{meals.length ? <div className="meal-grid">{meals.slice(0, 6).map(meal => <MealCard key={meal.id} meal={meal} />)}</div> : <Empty>今は誰も飯を募集してないみたい。</Empty>}</section>
    {popularAreas.length > 0 && <section className="section"><div className="section-heading"><div><span className="eyebrow orange">POPULAR AREAS</span><h2>今、人が集まりやすいエリア</h2><p className="muted">直近30日で実際に飯が成立した実績にもとづく表示です。</p></div></div><div className="area-bars">{popularAreas.map(a => <Link key={a.area} href={`/recruitments/${encodeURIComponent(a.area)}`} className="area-bar-row"><span>{a.area}</span><span className="muted">直近30日{a.completedMeals30d}件成立・成立率{Math.round(a.fillRate * 100)}%</span><ArrowRight size={16} /></Link>)}</div></section>}
    <BusinessRecruitBanner variant="partner" placement="HOME" href="/business" dismissible />
    <section className="invitation"><span>🍻</span><div><h2>「誰か飯いかん？」から始めよう。</h2><p>ラーメン一杯でも、ちょっと贅沢な夜ごはんでも。</p></div><Link className="btn" href="/meals/new">飯を募集する <ArrowRight size={17} /></Link></section>
  </>;
}
