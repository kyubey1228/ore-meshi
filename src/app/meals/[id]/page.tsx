import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMealById, getMealShareData } from '@/lib/data';
import { currentUserId } from '@/server/auth';
import { candidateLabel, paymentLabels, yen, mealStatusLabels, requestStatusLabels, dateTimeLabel } from '@/lib/format';
import { UserAvatar } from '@/components/meal-card';
import { DiningTypePills, TagPills } from '@/components/tag-pills';
import { XShareButton } from '@/components/x-share-button';
import { JoinForm, RequestDecision, CancelRequest, MealStatusControls } from '@/components/meal-controls';
import { appUrl, matchedShareText, mealShareText, remainingSlots, truncate, xIntent } from '@/lib/social';

type Props={params:Promise<{id:string}>};
const alt='「俺は誰かと飯が食いたい！」の飯募集';
export async function generateMetadata({params}:Props):Promise<Metadata>{
  const {id}=await params;const meal=await getMealShareData(id);
  if(!meal)return {title:'飯募集が見つかりません'};
  const remaining=remainingSlots(meal);
  const state=meal.status==='OPEN'?(remaining===1?'あと1人！':`あと${remaining}人`):meal.status==='MATCHED'?'飯、決まった。':mealStatusLabels[meal.status];
  const description=truncate(`${state} ${meal.area}で「${meal.title}」 #誰か飯いこ`,120);
  const image=`${appUrl()}/meals/${encodeURIComponent(id)}/opengraph-image`;
  return {title:meal.title,description,openGraph:{title:meal.title,description,type:'website',images:[{url:image,width:1200,height:630,alt}]},twitter:{card:'summary_large_image',title:meal.title,description,images:[image]}};
}

export default async function MealDetail({params}:Props){
  const {id}=await params;
  const [meal,userId]=await Promise.all([getMealById(id),currentUserId()]);
  if(!meal)notFound();
  const host=meal.hostId===userId;
  const myRequest=meal.joinRequests.find(request=>request.userId===userId);
  const remaining=remainingSlots(meal);
  const shareHref=xIntent(meal.status==='MATCHED'?matchedShareText(meal,meal._count.joinRequests+1):mealShareText(meal));
  const shareLabel=meal.status==='OPEN'?'Xで誰か呼ぶ':meal.status==='MATCHED'?'Xで報告する':'Xで共有する';
  return <section className="section narrow">
    <Link className="text-link" href="/meals">← 飯の一覧へ</Link>
    <div className={`panel detail${meal.status==='OPEN'&&remaining===1?' last-slot':''}`}>
      <div className="row between wrap"><span className="tag">{mealStatusLabels[meal.status]}</span><XShareButton href={shareHref} label={shareLabel}/></div>
      {meal.status==='OPEN'&&remaining===1&&<p className="last-slot-label">🔥 あと1人で飯決定！</p>}
      <h1>{meal.title}</h1>
      <TagPills tags={meal.purposes.map(({purpose})=>purpose)} tone="orange"/>
      <Link className="person" href={`/users/${meal.host.id}`}><UserAvatar user={meal.host}/><span><strong>{meal.host.displayName}</strong><small>@{meal.host.twitterUsername}</small></span></Link>
      <p className="pre-wrap">{meal.description}</p>
      <dl className="detail-list">
        <div><dt>どこ</dt><dd>{meal.area}{meal.restaurant&&` / ${meal.restaurant}`}</dd></div>
        <div><dt>いつ</dt><dd>{meal.candidates.map(candidate=><p key={candidate.id}>{candidateLabel(candidate)}</p>)}</dd></div>
        <div><dt>いくら</dt><dd>{yen(meal.budgetMin)}〜{yen(meal.budgetMax)} / 人</dd></div>
        <div><dt>お会計</dt><dd>{paymentLabels[meal.paymentType]}</dd></div>
        <div><dt>何人</dt><dd>{meal._count.joinRequests+1} / {meal.maxParticipants}人（募集者含む）</dd></div>
        {meal.deadline&&<div><dt>締切</dt><dd>{dateTimeLabel(meal.deadline)}</dd></div>}
        {[{label:'ジャンル',value:meal.genre},{label:'お酒',value:meal.alcohol},{label:'たばこ',value:meal.smoking},{label:'年齢条件',value:meal.ageCondition}].filter(value=>value.value).map(value=><div key={value.label}><dt>{value.label}</dt><dd>{value.value}</dd></div>)}
      </dl>
      {meal.matches.map(match=><Link className="btn" key={match.id} href={`/matches/${match.id}`}>飯の予定を見る →</Link>)}
    </div>
    {host?<div className="panel">
      <h2>参加希望が届いてるよ</h2>
      {meal.joinRequests.length===0&&<p className="muted">まだ参加希望はありません。のんびり待とう。</p>}
      {meal.joinRequests.map(request=><article className="request" key={request.id}>
        <Link className="person" href={`/users/${request.userId}`}><UserAvatar user={request.user}/><span><strong>{request.user.displayName}</strong><small>@{request.user.twitterUsername}</small><DiningTypePills relations={request.user.diningTypes} limit={3}/></span></Link>
        <p>{candidateLabel(request.candidate)}</p><p className="pre-wrap">{request.message}</p><p className="muted">{requestStatusLabels[request.status]}</p>
        {request.status==='PENDING'&&<RequestDecision id={request.id} mealId={id}/>}
      </article>)}
      {meal.status==='OPEN'&&meal.joinRequests.length===0&&<Link className="text-link" href={`/meals/${id}/edit`}>募集を編集する →</Link>}
      {meal.status!=='CANCELLED'&&<><hr/><MealStatusControls id={id}/><p className="muted">募集のキャンセルと、成立済みの飯の予定のキャンセルは別の操作です。</p></>}
    </div>:myRequest?<div className="panel"><h2>{requestStatusLabels[myRequest.status]}</h2><p>{candidateLabel(myRequest.candidate)}</p>{myRequest.status==='PENDING'&&<CancelRequest id={myRequest.id}/>}</div>:meal.status==='OPEN'?<div className="panel"><h2>この飯、一緒にどう？</h2>{userId?<JoinForm mealId={id} candidates={meal.candidates.map(candidate=>({id:candidate.id,label:candidateLabel(candidate)}))}/>:<Link className="btn" href="/login">Twitter/Xでログインして、この飯に行く</Link>}</div>:null}
    <div className="panel"><h2>募集している人</h2><DiningTypePills relations={meal.host.diningTypes} limit={5}/><p>{meal.host.bio||'気軽に一緒に飯いこう。'}</p><Link className="text-link" href={`/users/${meal.host.id}`}>プロフィールを見る →</Link></div>
  </section>;
}
