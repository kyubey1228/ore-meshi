import Link from 'next/link';
import { getActiveSeatCampaigns, getActiveStandaloneSponsoredMeals, getMealList, getMealPurposes, getRecentOpenMeals, getUserPreferences } from '@/lib/data';
import { currentUserId } from '@/server/auth';
import { filterSchema } from '@/validators';
import { paymentLabels } from '@/lib/format';
import { rankMeals } from '@/lib/meal-ranking';
import { MealCard } from '@/components/meal-card';
import { SponsoredMealBanner } from '@/components/sponsored-meal-banner';
import { SeatCampaignBanner } from '@/components/seat-campaign-banner';
import { GrowthTracker, TrackedLink } from '@/components/growth-tracker';
import { RankedMealGrid } from '@/components/ranked-meal-grid';
import { RecentlyViewedSection } from '@/components/recently-viewed';

export const metadata={title:'誰かの飯に乗っかる'};

const QUICK_FILTERS: { key: 'when'|'remaining'; value: string; label: string }[] = [
  { key: 'when', value: 'today', label: '今日' },
  { key: 'when', value: 'tonight', label: '今夜' },
  { key: 'when', value: 'soon', label: '3時間以内' },
  { key: 'remaining', value: '1', label: 'あと1人' },
];

function quickFilterHref(raw: Record<string,string|string[]|undefined>, key: 'when'|'remaining', value: string){
  const params=new URLSearchParams();
  for(const [k,v] of Object.entries(raw)){if(typeof v==='string'&&k!==key)params.set(k,v);}
  const isActive=raw[key]===value;
  if(!isActive)params.set(key,value);
  return `/meals${params.toString()?`?${params.toString()}`:''}`;
}

export default async function Meals({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const raw=await searchParams;
  const parsed=filterSchema.safeParse(raw);
  const filters=parsed.success?parsed.data:{};
  const userId=await currentUserId();
  const preferences=userId?await getUserPreferences(userId):null;
  const context={preferredArea:preferences?.preferredArea,preferredGenres:preferences?.preferredGenres};
  const [meals,purposes,sponsoredMeals,seatCampaigns]=await Promise.all([getMealList(filters,context),getMealPurposes(),getActiveStandaloneSponsoredMeals(filters.area),getActiveSeatCampaigns(filters.area)]);
  const recentMeals=meals.length?[]:await getRecentOpenMeals(4);
  const createHref=userId?'/meals/new':`/login?next=${encodeURIComponent('/meals/new')}`;
  const personalizationEnabled=Boolean(preferences?.preferredArea||preferences?.preferredGenres.length);
  const rankedItems=rankMeals(meals,{...context,now:new Date()}).map(r=>({meal:r.meal,reason:r.reason}));

  return <section className="section">
    <div className="section-heading">
      <div><span className="eyebrow orange">FIND YOUR NEXT MEAL</span><h1>誰かの飯に乗っかる。</h1><p className="muted">今日の「うまい」を、一緒に。</p></div>
      <TrackedLink className="btn secondary" eventType="RECRUITMENT_CREATE_CLICKED" payload={{area:filters.area,loggedIn:Boolean(userId)}} href={createHref}>飯相手を募集する</TrackedLink>
    </div>
    {!userId&&<GrowthTracker eventType="SIGNUP_CTA_VIEW" source="meals_list_create_cta" loggedIn={false}/>}
    <GrowthTracker eventType="QUICK_FILTER_VIEW" loggedIn={Boolean(userId)}/>
    <RecentlyViewedSection loggedIn={Boolean(userId)}/>
    <SeatCampaignBanner items={seatCampaigns} />
    <SponsoredMealBanner items={sponsoredMeals} />
    <div className="tag-pills quick-filters">
      {QUICK_FILTERS.map(qf=>(
        <TrackedLink key={`${qf.key}-${qf.value}`} className={`tag-pill${raw[qf.key]===qf.value?' orange-pill':''}`} eventType="QUICK_FILTER_CLICKED" payload={{source:`${qf.key}:${qf.value}`,loggedIn:Boolean(userId)}} href={quickFilterHref(raw,qf.key,qf.value)}>{qf.label}</TrackedLink>
      ))}
    </div>
    <form className="filter-bar">
      <label>いつ<input type="date" name="date" defaultValue={filters.date}/></label>
      <label>どこ<input name="area" placeholder="例：新宿" maxLength={80} defaultValue={filters.area}/></label>
      <label>予算の上限<select name="budget" defaultValue={filters.budget??''}><option value="">こだわらない</option><option value="1000">1,000円まで</option><option value="3000">3,000円まで</option><option value="5000">5,000円まで</option><option value="10000">10,000円まで</option></select></label>
      <label>お会計<select name="paymentType" defaultValue={filters.paymentType}><option value="">こだわらない</option>{Object.entries(paymentLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
      <label>どんな飯？<select name="purpose" defaultValue={filters.purpose??''}><option value="">こだわらない</option>{purposes.map(purpose=><option key={purpose.id} value={purpose.slug}>{purpose.label}</option>)}</select></label>
      <button className="btn">飯を探す</button><Link className="text-link" href="/meals">リセット</Link>
    </form>
    {!parsed.success&&<p role="alert" className="error">検索条件を確認してください。</p>}
    <p className="muted">{meals.length}件の飯 {personalizationEnabled?'· あなた向けにおすすめ順で表示':'· あと1人、開催日時、新着順を考慮して表示'}</p>
    {meals.length?<RankedMealGrid items={rankedItems} personalizationEnabled={personalizationEnabled}/>:(
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
