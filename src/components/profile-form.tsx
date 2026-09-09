'use client';
import { ActionForm } from '@/components/action-form';
import { updateProfile } from '@/server/actions/users';
export function ProfileForm({ displayName, bio }: { displayName: string; bio: string }) { return <div className="panel"><ActionForm label="プロフィールを保存" action={data => updateProfile({ displayName: data.get('displayName'), bio: data.get('bio') })}><label>表示名<input name="displayName" required maxLength={50} defaultValue={displayName} /></label><label>自己紹介<textarea name="bio" maxLength={500} rows={5} defaultValue={bio} /></label></ActionForm></div>; }
