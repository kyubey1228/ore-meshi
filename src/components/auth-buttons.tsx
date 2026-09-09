'use client';
import { signIn, signOut } from 'next-auth/react';
import { useState } from 'react';
export function LoginButton({disabled=false}:{disabled?:boolean}){const [busy,setBusy]=useState(false);return <button className="btn dark-btn" disabled={disabled||busy} onClick={()=>{setBusy(true);void signIn('twitter',{callbackUrl:'/mypage'});}}>{busy?'Xへ移動中…':'𝕏  Twitter/Xでログイン'}</button>;}
export function LogoutButton(){return <button className="text-link" onClick={()=>void signOut({callbackUrl:'/'})}>ログアウト</button>;}
