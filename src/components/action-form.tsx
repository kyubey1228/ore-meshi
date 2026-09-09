'use client';
import { useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { ActionResult } from '@/server/action';
export function ActionForm({action,children,label,confirm}: {action:(data:FormData)=>Promise<ActionResult>;children?:ReactNode;label:string;confirm?:string}){
  const [pending,start]=useTransition();const [result,setResult]=useState<ActionResult>();const router=useRouter();
  return <form className="action-form" action={data=>{if(confirm && !window.confirm(confirm))return;start(async()=>{try{const res=await action(data);setResult(res);if(res.ok){if(res.href)router.push(res.href);router.refresh();}}catch{setResult({ok:false,message:'送信できませんでした。もう一度お試しください。'});}});}}><fieldset disabled={pending}>{children}<button className="btn" disabled={pending}>{pending?'送信中…':label}</button></fieldset>{result && <p role={result.ok?'status':'alert'} className={result.ok?'success':'error'}>{result.message}</p>}</form>;
}
