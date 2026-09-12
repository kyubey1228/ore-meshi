'use client';
import { createContext, useContext, useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ActionForm } from '@/components/action-form';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { createJoinRequest, cancelJoinRequest, decideJoinRequest } from '@/server/actions/join-requests';
import { setMealStatus } from '@/server/actions/meals';
import type { ActionResult } from '@/server/action';
import { trackGrowthEvent } from '@/components/growth-tracker';
import { initialUgcStyle, withUgcStyle } from '@/lib/ugc';

// 承認が成立(justMatched)すると、そのrequestは即座にstatus!=='PENDING'へ切り替わり、
// サーバー側のperform()が呼ぶrevalidatePath('/', 'layout')がServer Actionのレスポンスに
// 最新RSCペイロードを同梱するため、承認ボタンを持つ<RequestDecision>自体が同じコミットで
// アンマウントされてしまう。その中にローカルで持たせていた成立ダイアログの状態も一緒に消えて
// 描画されないことがある(表示されたりされなかったりするレース)。
// 常にマウントされ続ける<JoinRequestsPanel>側に状態を持ち上げて、この問題を避ける。
const MatchedContext = createContext<((result: ActionResult) => void) | null>(null);

export function JoinRequestsPanel({ mealId, children }: { mealId: string; children: ReactNode }) {
  const [result, setResult] = useState<ActionResult>();
  const router = useRouter();
  function viewPlan() { if (result?.matchId) router.push(`/matches/${result.matchId}`); }
  function reportOnX() {
    if (!result?.meal) return;
    const date = new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' }).format(new Date(result.meal.scheduledAt));
    const url = withUgcStyle(new URL(`/meals/${mealId}`, window.location.origin).toString(), initialUgcStyle(mealId));
    const text = ['飯、決まった。', '', date, `${result.meal.area}で${result.meal.title}`, '', `${result.meal.participantCount}人で飯に行くことになりました。`, '', '#誰か飯いこ', url].join('\n');
    window.open(`https://x.com/intent/tweet?${new URLSearchParams({ text }).toString()}`, '_blank', 'noopener,noreferrer');
  }
  return <MatchedContext.Provider value={setResult}>
    {children}
    <Dialog open={Boolean(result?.ok && result.justMatched)} onOpenChange={() => {}}>
      <DialogContent className="match-dialog" showCloseButton={false}>
        <div className="confetti" aria-hidden="true">{Array.from({ length: 18 }, (_, index) => <i key={index} />)}</div>
        <DialogHeader>
          <span className="match-emoji" aria-hidden="true">🍚</span>
          <DialogTitle>飯、決まった。</DialogTitle>
          <DialogDescription>{result?.meal && <>{new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' }).format(new Date(result.meal.scheduledAt))}<br />{result.meal.area} · {result.meal.title}<br /><strong>{result.meal.participantCount}人で行くことになりました。</strong></>}</DialogDescription>
        </DialogHeader>
        <DialogFooter><button type="button" className="btn secondary" onClick={reportOnX}>Xで報告する</button><button type="button" className="btn" onClick={viewPlan}>予定を見る</button></DialogFooter>
      </DialogContent>
    </Dialog>
  </MatchedContext.Provider>;
}

export function JoinForm({mealId,area,genre,candidates}:{mealId:string;area:string;genre:string|null;candidates:{id:string;label:string}[]}){
  const payload={recruitmentId:mealId,area,foodCategory:genre??undefined,loggedIn:true};
  return <ActionForm label="この募集に参加する" action={data=>{trackGrowthEvent('RECRUITMENT_JOIN_CLICKED',payload);return createJoinRequest({mealId,candidateId:data.get('candidateId'),message:data.get('message')}).then(result=>{if(result.ok)trackGrowthEvent('RECRUITMENT_JOIN_COMPLETED',payload);return result;});}}><label>行ける日時<select name="candidateId" required>{candidates.map(candidate=><option key={candidate.id} value={candidate.id}>{candidate.label}</option>)}</select></label><label>ひとこと（任意）<textarea name="message" maxLength={500} placeholder="はじめまして！ 一緒に行きたいです。"/></label></ActionForm>;}

export function RequestDecision({id,mealId}:{id:string;mealId:string}){
  const [pending,start]=useTransition();const [result,setResult]=useState<ActionResult>();const router=useRouter();
  const reportMatched=useContext(MatchedContext);
  function decide(accept:boolean){start(async()=>{try{const response=await decideJoinRequest({id,mealId,accept});if(response.ok&&response.justMatched){reportMatched?.(response);return;}setResult(response);if(response.ok)router.refresh();}catch{setResult({ok:false,message:'送信できませんでした。もう一度お試しください。'});}});}
  return <>
    <div className="row wrap"><button className="btn" type="button" disabled={pending} onClick={()=>decide(true)}>{pending?'送信中…':'一緒に行く'}</button><button className="btn secondary" type="button" disabled={pending} onClick={()=>decide(false)}>今回はごめん</button></div>
    {result&&!result.ok&&<p role="alert" className="error">{result.message}</p>}
  </>;
}
export function CancelRequest({id}:{id:string}){return <ActionForm label="参加希望を取り下げる" action={()=>cancelJoinRequest(id)}/>;}
export function MealStatusControls({id}:{id:string}){return <div className="row wrap"><ActionForm label="募集を締める" confirm="新しい参加希望の受付を終了しますか？" action={()=>setMealStatus({id,status:'CLOSED'})}/><ActionForm label="募集をキャンセル" confirm="この募集をキャンセルしますか？ 成立済みの飯の予定は別途キャンセルが必要です。" action={()=>setMealStatus({id,status:'CANCELLED'})}/></div>;}
