'use client';
import { useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { ActionResult } from '@/server/action';
import { usePushToast } from '@/components/toast';
// 成功メッセージはトースト(常にマウントされているルートlayoutのToastProvider)へ出す。
// mutation成功でこのフォーム自体が親の条件分岐で消える呼び出し元(参加後にJoinFormが消える等)でも、
// perform()のrevalidatePath('/', 'layout')によるRSC再描画と同じコミットでローカルの成功表示ごと
// 消えてしまうレースを避けられる。失敗時はフォームがそのまま残るためレースが起きず、従来通りその場に表示する。
export function ActionForm({action,children,label,confirm,onResult}: {action:(data:FormData)=>Promise<ActionResult>;children?:ReactNode;label:string;confirm?:string;onResult?:(result:ActionResult)=>void}){
  const [pending,start]=useTransition();const [error,setError]=useState<string>();const router=useRouter();const pushToast=usePushToast();
  return <form className="action-form" action={data=>{if(confirm && !window.confirm(confirm))return;start(async()=>{try{const res=await action(data);onResult?.(res);if(res.ok){setError(undefined);pushToast('status',res.message);if(res.href)router.push(res.href);router.refresh();}else{setError(res.message);}}catch{const failure:ActionResult={ok:false,message:'送信できませんでした。もう一度お試しください。'};onResult?.(failure);setError(failure.message);}});}}><fieldset disabled={pending}>{children}<button className="btn" disabled={pending}>{pending?'送信中…':label}</button></fieldset>{error && <p role="alert" className="error">{error}</p>}</form>;
}
