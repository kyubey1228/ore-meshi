'use client';
import { ActionForm } from '@/components/action-form';
import { createBusinessAccount } from '@/server/actions/business';
export function BusinessOnboardingForm(){return <div className="panel"><ActionForm label="店舗管理をはじめる" action={data=>createBusinessAccount({name:data.get('name'),slug:data.get('slug'),area:data.get('area')})}><label>店舗・会社名<input name="name" required maxLength={80}/></label><label>管理用ID（半角英数字とハイフン）<input name="slug" required minLength={3} maxLength={50} pattern="[a-z0-9-]+"/></label><label>主なエリア<input name="area" maxLength={80}/></label></ActionForm></div>;}
