import Link from 'next/link';
import { getActiveSeatCampaigns, getActiveStandaloneSponsoredMeals, getAreaOptionsGrouped, getMealList, getMealPurposes, getRecentOpenMeals, getUserPreferences } from '@/lib/data';
import { AreaSearchField } from '@/components/area-search-field';
import { currentUserId } from '@/server/auth';
import { filterSchema } from '@/validators';
import { paymentLabels } from '@/lib/format';
import { rankMeals } from '@/lib/meal-ranking';
import { getRecommendationTopPicks } from '@/server/recommendation-profile';
import { MealCard } from '@/components/meal-card';
import { SponsoredMealBanner } from '@/components/sponsored-meal-banner';
import { SeatCampaignBanner } from '@/components/seat-campaign-banner';
import { GrowthTracker, TrackedLink } from '@/components/growth-tracker';
import { RankedMealGrid } from '@/components/ranked-meal-grid';
import { RecentlyViewedSection } from '@/components/recently-viewed';
import { getEmptyStateData } from '@/server/empty-state';
import { buildEmptyState } from '@/lib/empty-state';
import { EMPTY_STATE_VARIANTS, getVariant } from '@/lib/experiments';
import { appUrl } from '@/lib/social';

const description='現在募集中の飯を探して参加できます。今日の「うまい」を誰かと。';
const shareImage=`${appUrl()}/api/ugc/invite?style=gag`;
export const metadata={
  title:'誰かの飯に乗っかる',
  description,
  openGraph:{title:'誰かの飯に乗っかる',description,url:`${appUrl()}/meals`,images:[{url:shareImage,width:1200,height:630}]},
  twitter:{card:'summary_large_image' as const,title:'誰かの飯に乗っかる',description,images:[shareImage]},
};

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
  // preferences/recommendationProfileはgetMealListのランキングに必要だが、purposes/sponsoredMeals/seatCampaignsは
  // それらと無関係なので同じ待ち行列に入れて1段目から並行取得する(以前は2段階のwaterfallになっていた)。
  const [preferences,recommendationProfile,purposes,sponsoredMeals,seatCampaigns,areaOptionsGrouped]=await Promise.all([
    userId?getUserPreferences(userId):Promise.resolve(null),
    userId?getRecommendationTopPicks(userId):Promise.resolve(null),
    getMealPurposes(),
    getActiveStandaloneSponsoredMeals(filters.area),
    getActiveSeatCampaigns(filters.area),
    getAreaOptionsGrouped(),
  ]);
  const context={preferredArea:preferences?.preferredArea,preferredGenres:preferences?.preferredGenres,recommendationProfile};
  const meals=await getMealList(filters,context);
  const recentMeals=meals.length?[]:await getRecentOpenMeals(4);
  const emptyData=meals.length?null:await getEmptyStateData(filters.area);
  const emptyVariant=getVariant('meal_empty_state',userId??filters.area??'anonymous',EMPTY_STATE_VARIANTS);
  const emptyCopy=emptyData?buildEmptyState({...emptyData,area:filters.area,variant:emptyVariant}):null;
  const createHref=userId?'/meals/new':`/login?next=${encodeURIComponent('/meals/new')}`;
  const personalizationEnabled=Boolean(preferences?.preferredArea||preferences?.preferredGenres.length);
  const rankedItems=rankMeals(meals,{...context,now:new Date()}).map(r=>({meal:r.meal,reason:r.reason}));

  return <section className="section">
    <div className="section-heading">
      <div><span className="eyebrow orange">FIND YOUR NEXT MEAL</span><h1>誰かの飯に乗っかる。</h1><p className="muted">今日の「うまい」を、一緒に。</p></div>
      <div className="row wrap"><Link className="text-link" href="/demand">募集が無くても行きたい登録する →</Link><Link className="text-link" href="/coupons">クーポンを見る →</Link><TrackedLink className="btn secondary" eventType="RECRUITMENT_CREATE_CLICKED" payload={{area:filters.area,loggedIn:Boolean(userId)}} href={createHref}>飯相手を募集する</TrackedLink></div>
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
      <AreaSearchField defaultValue={filters.area} grouped={areaOptionsGrouped}/>
      <label>予算の上限<select name="budget" defaultValue={filters.budget??''}><option value="">こだわらない</option><option value="1000">1,000円まで</option><option value="3000">3,000円まで</option><option value="5000">5,000円まで</option><option value="10000">10,000円まで</option></select></label>
      <label>お会計<select name="paymentType" defaultValue={filters.paymentType}><option value="">こだわらない</option>{Object.entries(paymentLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
      <label>どんな飯？<select name="purpose" defaultValue={filters.purpose??''}><option value="">こだわらない</option>{purposes.map(purpose=><option key={purpose.id} value={purpose.slug}>{purpose.label}</option>)}</select></label>
      <button className="btn">飯を探す</button><Link className="text-link" href="/meals">リセット</Link>
    </form>
    {!parsed.success&&<p role="alert" className="error">検索条件を確認してください。</p>}
    <p className="muted">{meals.length}件の飯 {personalizationEnabled?'· あなた向けにおすすめ順で表示':'· あと1人、開催日時、新着順を考慮して表示'}</p>
    {meals.length?<RankedMealGrid items={rankedItems} personalizationEnabled={personalizationEnabled}/>:(
      <div className="empty">
        <GrowthTracker eventType="EMPTY_STATE_VIEWED" area={filters.area} variant={emptyVariant} source="meals_list" loggedIn={Boolean(userId)}/>
        <span className="empty-icon">🍚</span>
        <p>{emptyCopy?.headline}</p>
        {emptyCopy?.timingText&&<p className="muted">{emptyCopy.timingText}</p>}
        {emptyCopy?.nearbyText&&<p>{emptyCopy.nearbyText}</p>}
        <div className="row center wrap"><TrackedLink className="btn" eventType="EMPTY_STATE_CTA_CLICKED" payload={{area:filters.area,loggedIn:Boolean(userId),source:'create',variant:emptyVariant}} href={createHref}>{emptyCopy?.primaryLabel} →</TrackedLink><TrackedLink className="btn secondary" eventType="EMPTY_STATE_CTA_CLICKED" payload={{area:filters.area,loggedIn:Boolean(userId),source:'demand',variant:emptyVariant}} href="/demand">希望を登録</TrackedLink></div>
      </div>
    )}
    {recentMeals.length>0&&<div className="section-heading"><h2>新着の募集</h2></div>}
    {recentMeals.length>0&&<div className="meal-grid">{recentMeals.map(meal=><MealCard key={meal.id} meal={meal}/>)}</div>}
  </section>;
}
