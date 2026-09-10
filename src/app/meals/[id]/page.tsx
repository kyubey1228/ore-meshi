import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { getFavoriteMealIds, getHostTrustStats, getMealById, getMealShareData } from '@/lib/data';
import { currentUserId } from '@/server/auth';
import { getOrCreateReferralCode } from '@/server/referral';
import { resolveJoinIntent } from '@/server/actions/join-intent';
import { computeHostTrustBadges } from '@/lib/host-trust';
import { getVariant, JOIN_CTA_COPY } from '@/lib/experiments';
import { candidateLabel, paymentLabels, yen, mealStatusLabels, requestStatusLabels, dateTimeLabel } from '@/lib/format';
import { UserAvatar } from '@/components/meal-card';
import { DiningTypePills, TagPills } from '@/components/tag-pills';
import { JoinForm, RequestDecision, CancelRequest, MealStatusControls } from '@/components/meal-controls';
import { GrowthTracker, TrackedLink } from '@/components/growth-tracker';
import { MealShareActions } from '@/components/meal-share-actions';
import { JoinIntentCta } from '@/components/join-intent-cta';
import { JoinIntentConfirm } from '@/components/join-intent-confirm';
import { TrustBadges } from '@/components/trust-badges';
import { FavoriteButton } from '@/components/favorite-button';
import { ReferralShare } from '@/components/referral-share';
import { ReferralClickRecorder } from '@/components/referral-click-recorder';
import { RecentlyViewedRecorder } from '@/components/recently-viewed-recorder';
import { MobileStickyJoinBar } from '@/components/mobile-sticky-join-bar';
import { appUrl, matchedShareText, mealShareText, mealUrl, remainingSlots, truncate } from '@/lib/social';

type Props={params:Promise<{id:string}>;searchParams:Promise<{ref?:string}>};
const alt='「俺は誰かと飯が食いたい！」の飯募集';
export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{
  const {id}=await params;const meal=await getMealShareData(id);
  if(!meal)return {title:'飯募集が見つかりません'};
  const remaining=remainingSlots(meal);
  const state=meal.status==='OPEN'?(remaining===1?'あと1人！':`あと${remaining}人`):meal.status==='MATCHED'?'飯、決まった。':mealStatusLabels[meal.status];
  const description=truncate(`${state} ${meal.area}で「${meal.title}」 #誰か飯いこ`,120);
  const image=`${appUrl()}/meals/${encodeURIComponent(id)}/opengraph-image`;
  const url=mealUrl(id);
  const indexable=meal.status==='OPEN'||meal.status==='MATCHED';
  return {
    title:meal.title,
    description,
    alternates:{canonical:url},
    robots:indexable?{index:true,follow:true}:{index:false,follow:true},
    openGraph:{title:meal.title,description,type:'website',url,images:[{url:image,width:1200,height:630,alt}]},
    twitter:{card:'summary_large_image',title:meal.title,description,images:[image]},
  };
}

export default async function MealDetail({params,searchParams}:Props){
  const [{id},query]=await Promise.all([params,searchParams]);
  const [meal,userId]=await Promise.all([getMealById(id),currentUserId()]);
  if(!meal)notFound();
  const host=meal.hostId===userId;
  const myRequest=meal.joinRequests.find(request=>request.userId===userId);
  const remaining=remainingSlots(meal);
  const shareText=meal.status==='MATCHED'?matchedShareText(meal,meal._count.joinRequests+1):mealShareText(meal);
  const url=mealUrl(id);
  const firstCandidate=meal.candidates[0];
  const jsonLd=firstCandidate?{
    '@context':'https://schema.org','@type':'Event',name:meal.title,
    startDate:`${firstCandidate.date.toISOString().slice(0,10)}T${firstCandidate.startTime}:00+09:00`,
    location:{'@type':'Place',name:`${meal.area}${meal.restaurant?` ${meal.restaurant}`:''}`},
    eventStatus:meal.status==='CANCELLED'?'https://schema.org/EventCancelled':'https://schema.org/EventScheduled',
    eventAttendanceMode:'https://schema.org/OfflineEventAttendanceMode',
    offers:{'@type':'Offer','price':meal.budgetMin,'priceCurrency':'JPY','availability':meal.status==='OPEN'?'https://schema.org/InStock':'https://schema.org/SoldOut',url},
    organizer:{'@type':'Person',name:meal.host.displayName},
    description:meal.description??undefined,
    url,
  }:null;

  const canJoin=!host&&!myRequest&&meal.status==='OPEN';
  const [intent,hostStats,favoriteIds,sessionKey]=await Promise.all([
    userId&&canJoin?resolveJoinIntent(id,true):Promise.resolve(null),
    getHostTrustStats(meal.hostId),
    userId?getFavoriteMealIds(userId):Promise.resolve([]),
    (async()=>(await cookies()).get('ore_growth_session')?.value??id)(),
  ]);
  const trustBadges=computeHostTrustBadges({hostedCount:hostStats.hostedCount,completedCount:hostStats.completedCount,bio:meal.host.bio,image:meal.host.image,diningTypeCount:meal.host.diningTypes.length});
  const experimentVariants=remaining===1?['A','B','C']:['A','B'];
  const variant=canJoin&&!userId?getVariant('join_cta',sessionKey,experimentVariants):null;
  const canInvite=Boolean(userId)&&meal.status==='OPEN'&&(host||myRequest?.status==='ACCEPTED');
  const inviteCode=canInvite?await getOrCreateReferralCode(userId as string):null;

  return <section className="section narrow">
    <GrowthTracker eventType="RECRUITMENT_VIEWED" recruitmentId={id} area={meal.area} foodCategory={meal.genre??undefined} loggedIn={Boolean(userId)}/>
    <RecentlyViewedRecorder mealId={id}/>
    {query.ref&&<ReferralClickRecorder referralCode={query.ref} mealId={id}/>}
    {jsonLd&&<script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd)}}/>}
    <Link className="text-link" href="/meals">← 飯の一覧へ</Link>
    {canJoin&&<MobileStickyJoinBar area={meal.area} when={firstCandidate?candidateLabel(firstCandidate):'日時調整中'} remaining={remaining} participantCount={meal._count.joinRequests+1}/>}
    <div className={`panel detail${meal.status==='OPEN'&&remaining===1?' last-slot':''}`}>
      <div className="row between wrap"><span className="tag">{mealStatusLabels[meal.status]}</span><FavoriteButton mealId={id} loggedIn={Boolean(userId)} initialFavorite={favoriteIds.includes(id)}/></div>
      {meal.status==='OPEN'&&remaining===1&&<p className="last-slot-label">🔥 あと1人で飯決定！</p>}
      {meal.sponsoredMeals[0]&&<p className="last-slot-label">PR · 提供:{meal.sponsoredMeals[0].sponsorName}{meal.sponsoredMeals[0].benefit?` / ${meal.sponsoredMeals[0].benefit}`:''}</p>}
      <h1>{meal.title}</h1>
      <TagPills tags={meal.purposes.map(({purpose})=>purpose)} tone="orange"/>
      <TrackedLink className="person" eventType="HOST_PROFILE_OPENED" payload={{recruitmentId:id}} href={`/users/${meal.host.id}`}><UserAvatar user={meal.host}/><span><strong>{meal.host.displayName}</strong><small>@{meal.host.twitterUsername}</small></span></TrackedLink>
      <TrustBadges badges={trustBadges} mealId={id}/>
      <p className="pre-wrap">{meal.description}</p>
      <dl className="detail-list">
        <div><dt>どこ</dt><dd>{meal.area}{meal.restaurant&&` / ${meal.restaurant}`}</dd></div>
        <div><dt>いつ</dt><dd>{meal.candidates.map(candidate=><p key={candidate.id}>{candidateLabel(candidate)}</p>)}</dd></div>
        <div><dt>いくら</dt><dd>{yen(meal.budgetMin)}〜{yen(meal.budgetMax)} / 人</dd></div>
        <div><dt>お会計</dt><dd>{paymentLabels[meal.paymentType]}</dd></div>
        <div><dt>何人</dt><dd>{meal._count.joinRequests+1} / {meal.maxParticipants}人（募集者含む）</dd></div>
        {meal.status==='OPEN'&&<div><dt>残り</dt><dd>あと{remaining}人</dd></div>}
        {meal.deadline&&<div><dt>締切</dt><dd>{dateTimeLabel(meal.deadline)}</dd></div>}
        {[{label:'ジャンル',value:meal.genre},{label:'お酒',value:meal.alcohol},{label:'たばこ',value:meal.smoking},{label:'年齢条件',value:meal.ageCondition}].filter(value=>value.value).map(value=><div key={value.label}><dt>{value.label}</dt><dd>{value.value}</dd></div>)}
      </dl>
      {meal.matches.map(match=><Link className="btn" key={match.id} href={`/matches/${match.id}`}>飯の予定を見る →</Link>)}
    </div>

    {intent&&<JoinIntentConfirm token={intent.token} candidates={meal.candidates.map(candidate=>({id:candidate.id,label:candidateLabel(candidate)}))}/>}

    {canJoin&&!intent&&<div className="panel" id="join-panel">
      <h2>この募集に参加する</h2>
      {userId
        ?<JoinForm mealId={id} area={meal.area} genre={meal.genre} candidates={meal.candidates.map(candidate=>({id:candidate.id,label:candidateLabel(candidate)}))}/>
        :<JoinIntentCta mealId={id} area={meal.area} genre={meal.genre} label={variant?JOIN_CTA_COPY[variant]:'この募集に参加する'} experimentName={variant?'join_cta':undefined} variant={variant??undefined}/>
      }
    </div>}

    <div className="panel">
      <h2>この募集をシェアする</h2>
      <MealShareActions mealId={id} area={meal.area} genre={meal.genre} text={shareText} url={url}/>
    </div>

    {inviteCode&&<ReferralShare inviteUrl={`${appUrl()}/invite/${inviteCode}`} mealId={id} text={`${remaining>0?`あと${remaining}人で集まります！`:''}\n${firstCandidate?`${candidateLabel(firstCandidate)}〜`:''}${meal.area}で${meal.title}\n\n${appUrl()}/invite/${inviteCode}`}/>}

    {host&&<div className="panel">
      <h2>参加希望が届いてるよ</h2>
      {meal.joinRequests.length===0&&<p className="muted">まだ参加希望はありません。のんびり待とう。</p>}
      {meal.joinRequests.map(request=><article className="request" key={request.id}>
        <Link className="person" href={`/users/${request.userId}`}><UserAvatar user={request.user}/><span><strong>{request.user.displayName}</strong><small>@{request.user.twitterUsername}</small><DiningTypePills relations={request.user.diningTypes} limit={3}/></span></Link>
        <p>{candidateLabel(request.candidate)}</p><p className="pre-wrap">{request.message}</p><p className="muted">{requestStatusLabels[request.status]}</p>
        {request.status==='PENDING'&&<RequestDecision id={request.id} mealId={id}/>}
      </article>)}
      {meal.status==='OPEN'&&meal.joinRequests.length===0&&<Link className="text-link" href={`/meals/${id}/edit`}>募集を編集する →</Link>}
      {meal.status!=='CANCELLED'&&<><hr/><MealStatusControls id={id}/><p className="muted">募集のキャンセルと、成立済みの飯の予定のキャンセルは別の操作です。</p></>}
    </div>}
    {!host&&myRequest&&<div className="panel"><h2>{requestStatusLabels[myRequest.status]}</h2><p>{candidateLabel(myRequest.candidate)}</p>{myRequest.status==='PENDING'&&<CancelRequest id={myRequest.id}/>}</div>}
    <div className="panel"><h2>募集している人</h2><DiningTypePills relations={meal.host.diningTypes} limit={5}/><p>{meal.host.bio||'気軽に一緒に飯いこう。'}</p><TrackedLink className="text-link" eventType="HOST_PROFILE_OPENED" payload={{recruitmentId:id}} href={`/users/${meal.host.id}`}>プロフィールを見る →</TrackedLink></div>
  </section>;
}
