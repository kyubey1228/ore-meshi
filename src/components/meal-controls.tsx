'use client';
import { ActionForm } from '@/components/action-form';
import { createJoinRequest, cancelJoinRequest, decideJoinRequest } from '@/server/actions/join-requests';
import { setMealStatus } from '@/server/actions/meals';
export function JoinForm({mealId,candidates}:{mealId:string;candidates:{id:string;label:string}[]}){return <ActionForm label="この飯に行く" action={data=>createJoinRequest({mealId,candidateId:data.get('candidateId'),message:data.get('message')})}><label>行ける日時<select name="candidateId" required>{candidates.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label><label>ひとこと（任意）<textarea name="message" maxLength={500} placeholder="はじめまして！ 一緒に行きたいです。"/></label></ActionForm>;}
export function RequestDecision({id,mealId}:{id:string;mealId:string}){return <div className="row wrap"><ActionForm label="一緒に行く" action={()=>decideJoinRequest({id,mealId,accept:true})}/><ActionForm label="今回はごめん" action={()=>decideJoinRequest({id,mealId,accept:false})}/></div>;}
export function CancelRequest({id}:{id:string}){return <ActionForm label="参加希望を取り下げる" action={()=>cancelJoinRequest(id)}/>;}
export function MealStatusControls({id}:{id:string}){return <div className="row wrap"><ActionForm label="募集を締める" confirm="新しい参加希望の受付を終了しますか？" action={()=>setMealStatus({id,status:'CLOSED'})}/><ActionForm label="募集をキャンセル" confirm="この募集をキャンセルしますか？ 成立済みの飯の予定は別途キャンセルが必要です。" action={()=>setMealStatus({id,status:'CANCELLED'})}/></div>;}
