import Link from 'next/link';
import { getActiveSeatCampaigns, getActiveStandaloneSponsoredMeals, getMealList, getMealPurposes, getRecentOpenMeals } from '@/lib/data';
import { currentUserId } from '@/server/auth';
import { filterSchema } from '@/validators';
import { paymentLabels } from '@/lib/format';
import { MealCard } from '@/components/meal-card';
import { SponsoredMealBanner } from '@/components/sponsored-meal-banner';
import { SeatCampaignBanner } from '@/components/seat-campaign-banner';
import { GrowthTracker, TrackedLink } from '@/components/growth-tracker';

export const metadata={title:'誰かの飯に乗っかる'};

export default async function Meals({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const raw=await searchParams;
  const parsed=filterSchema.safeParse(raw);
  const filters=parsed.success?parsed.data:{};
  const [meals,purposes,sponsoredMeals,seatCampaigns,userId]=await Promise.all([getMealList(filters),getMealPurposes(),getActiveStandaloneSponsoredMeals(filters.area),getActiveSeatCampaigns(filters.area),currentUserId()]);
  const recentMeals=meals.length?[]:await getRecentOpenMeals(4);
  const createHref=userId?'/meals/new':`/login?next=${encodeURIComponent('/meals/new')}`;

  return <section className="section">
    <div className="section-heading">
      <div><span className="eyebrow orange">FIND YOUR NEXT MEAL</span><h1>誰かの飯に乗っかる。</h1><p className="muted">今日の「うまい」を、一緒に。</p></div>
      <TrackedLink className="btn secondary" eventType="RECRUITMENT_CREATE_CLICKED" payload={{area:filters.area,loggedIn:Boolean(userId)}} href={createHref}>飯相手を募集する</TrackedLink>
    </div>
    {!userId&&<GrowthTracker eventType="SIGNUP_CTA_VIEW" source="meals_list_create_cta" loggedIn={false}/>}
    <SeatCampaignBanner items={seatCampaigns} />
    <SponsoredMealBanner items={sponsoredMeals} />
    <form className="filter-bar">
      <label>いつ<input type="date" name="date" defaultValue={filters.date}/></label>
      <label>どこ<input name="area" placeholder="例：新宿" maxLength={80} defaultValue={filters.area}/></label>
      <label>予算の上限<select name="budget" defaultValue={filters.budget??''}><option value="">こだわらない</option><option value="1000">1,000円まで</option><option value="3000">3,000円まで</option><option value="5000">5,000円まで</option><option value="10000">10,000円まで</option></select></label>
      <label>お会計<select name="paymentType" defaultValue={filters.paymentType}><option value="">こだわらない</option>{Object.entries(paymentLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
      <label>どんな飯？<select name="purpose" defaultValue={filters.purpose??''}><option value="">こだわらない</option>{purposes.map(purpose=><option key={purpose.id} value={purpose.slug}>{purpose.label}</option>)}</select></label>
      <button className="btn">飯を探す</button><Link className="text-link" href="/meals">リセット</Link>
    </form>
    {!parsed.success&&<p role="alert" className="error">検索条件を確認してください。</p>}
    <p className="muted">{meals.length}件の飯 · あと1人、開催日時、新着順を考慮して表示</p>
    {meals.length?<div className="meal-grid">{meals.map(meal=><MealCard key={meal.id} meal={meal}/>)}</div>:(
      <div className="empty">
        <span className="empty-icon">🍚</span>
        <p>{filters.area?`${filters.area}ではまだ募集がありません。`:'今は誰も飯を募集してないみたい。'}<br/>最初の募集を作ってみませんか？</p>
        <TrackedLink className="btn" eventType="RECRUITMENT_CREATE_CLICKED" payload={{area:filters.area,loggedIn:Boolean(userId),source:'empty_state'}} href={createHref}>募集を作る →</TrackedLink>
      </div>
    )}
    {recentMeals.length>0&&<div className="section-heading"><h2>新着の募集</h2></div>}
    {recentMeals.length>0&&<div className="meal-grid">{recentMeals.map(meal=><MealCard key={meal.id} meal={meal}/>)}</div>}
  </section>;
}
