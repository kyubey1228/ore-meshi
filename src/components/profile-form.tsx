'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ActionForm } from '@/components/action-form';
import { TagSelector, type SelectableTag } from '@/components/tag-selector';
import { updateProfile } from '@/server/actions/users';
export function ProfileForm({displayName,bio,email,diningTypes,selectedDiningTypeIds}:{displayName:string;bio:string;email:string;diningTypes:SelectableTag[];selectedDiningTypeIds:string[]}){
  const [selected,setSelected]=useState(selectedDiningTypeIds);
  return <div className="panel"><ActionForm label="プロフィールを保存" action={data=>updateProfile({displayName:data.get('displayName'),bio:data.get('bio'),email:data.get('email'),diningTypeIds:selected})}>
    <label>表示名<input name="displayName" required maxLength={50} defaultValue={displayName}/></label>
    <label>自己紹介<textarea name="bio" maxLength={500} rows={5} defaultValue={bio}/></label>
    <label>メールアドレス（任意・通知の送付先）<input id="email" name="email" type="email" maxLength={200} defaultValue={email} placeholder="you@example.com" aria-describedby="email-help" className="scroll-mt-24"/></label>
    <p id="email-help" className="muted">参加希望・承認・飯の成立をメールでも確認できます。入力後に「プロフィールを保存」を押してください。<Link className="text-link" href="/email-notifications">メール登録すると便利！</Link></p>
    <div className="field-group"><strong>飯タイプ</strong><p className="muted">あなたの飯のスタイルを最大5個まで選べます。</p><TagSelector tags={diningTypes} selected={selected} onChange={setSelected} max={5} label="飯タイプを選択"/></div>
  </ActionForm></div>;
}
