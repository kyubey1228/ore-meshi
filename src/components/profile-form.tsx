'use client';
import { useState } from 'react';
import { ActionForm } from '@/components/action-form';
import { TagSelector, type SelectableTag } from '@/components/tag-selector';
import { updateProfile } from '@/server/actions/users';
export function ProfileForm({displayName,bio,diningTypes,selectedDiningTypeIds}:{displayName:string;bio:string;diningTypes:SelectableTag[];selectedDiningTypeIds:string[]}){
  const [selected,setSelected]=useState(selectedDiningTypeIds);
  return <div className="panel"><ActionForm label="プロフィールを保存" action={data=>updateProfile({displayName:data.get('displayName'),bio:data.get('bio'),diningTypeIds:selected})}>
    <label>表示名<input name="displayName" required maxLength={50} defaultValue={displayName}/></label>
    <label>自己紹介<textarea name="bio" maxLength={500} rows={5} defaultValue={bio}/></label>
    <div className="field-group"><strong>飯タイプ</strong><p className="muted">あなたの飯のスタイルを最大5個まで選べます。</p><TagSelector tags={diningTypes} selected={selected} onChange={setSelected} max={5} label="飯タイプを選択"/></div>
  </ActionForm></div>;
}
