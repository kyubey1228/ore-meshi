'use client';
import { ActionForm } from '@/components/action-form';
import { createBusinessCampaign } from '@/server/actions/business';
const iso=(value:FormDataEntryValue|null)=>new Date(`${String(value)}:00+09:00`).toISOString();
export function BusinessCampaignForm({businessAccountId}:{businessAccountId:string}){return <details className="panel business-campaign-form"><summary>新しい宣伝内容を作る</summary><p className="muted">宣伝する内容を登録すると、すぐX共有プレビューを作れます。</p><ActionForm label="宣伝内容を登録" action={data=>createBusinessCampaign({businessAccountId,kind:data.get('kind'),title:data.get('title'),restaurantName:data.get('restaurantName'),area:data.get('area'),benefit:data.get('benefit'),startsAt:iso(data.get('startsAt')),endsAt:iso(data.get('endsAt')),participantLimit:data.get('participantLimit'),remaining:data.get('remaining')})}>
  <label>種類<select name="kind"><option value="SPONSORED_MEAL">スポンサー飯</option><option value="SPONSOR_CAMPAIGN">全額・企業スポンサー</option><option value="SEAT_CAMPAIGN">今、席空いてます</option><option value="COUPON">クーポン</option></select></label>
  <p className="muted">企業広告(Direct Ad)は<a className="text-link" href="/business/direct-ads">専用ページ</a>から出稿できます。</p>
  <label>見出し・スポンサー名<input name="title" required maxLength={80} placeholder="例：今日は店長のおごりです"/></label>
  <label>店舗名<input name="restaurantName" required maxLength={80}/></label>
  <label>エリア<input name="area" maxLength={80}/></label>
  <label>特典・提供内容<textarea name="benefit" maxLength={120} rows={3} placeholder="例：最初のドリンク無料"/></label>
  <div className="two-col"><label>開始日時<input name="startsAt" type="datetime-local" required/></label><label>終了・有効期限<input name="endsAt" type="datetime-local" required/></label></div>
  <div className="two-col"><label>募集人数<input name="participantLimit" type="number" min={1} max={100} defaultValue={4} required/></label><label>残り人数・席数<input name="remaining" type="number" min={0} max={100} defaultValue={4} required/></label></div>
</ActionForm></details>;}
