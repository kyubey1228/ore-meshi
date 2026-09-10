'use client';
import { useMemo, useState, useTransition } from 'react';
import type { CampaignPostType, CampaignShareData } from '@/features/x-sharing/templates';
import { buildTrackedCampaignUrl, generateCampaignPost } from '@/features/x-sharing/templates';
import { recordManualSocialShare } from '@/server/actions/business-social';

export function BusinessSharePreview({campaign,origin,postType:defaultPostType,eventId}:{campaign:CampaignShareData;origin:string;postType:CampaignPostType;eventId:string}){
  const [comment,setComment]=useState('');const [pending,start]=useTransition();const [error,setError]=useState('');
  const [postType,setPostType]=useState(defaultPostType);
  const url=useMemo(()=>buildTrackedCampaignUrl(origin,campaign,postType,eventId),[origin,campaign,postType,eventId]);
  const text=useMemo(()=>generateCampaignPost(campaign,url,postType,comment),[campaign,url,postType,comment]);
  const intent=`https://x.com/intent/tweet?${new URLSearchParams({text}).toString()}`;
  function record(){start(async()=>{const result=await recordManualSocialShare({businessAccountId:campaign.businessAccountId,entityType:campaign.kind,entityId:campaign.id,postType,eventId});if(!result.ok)setError(result.message);});}
  return <section className="panel business-share-preview">
    <h2>Xではこんな感じ</h2>
    {(campaign.kind==='SPONSORED_MEAL'||campaign.kind==='SPONSOR_CAMPAIGN')&&<label>どんな呼びかけ？<select value={postType} onChange={event=>setPostType(event.target.value as CampaignPostType)}><option value={campaign.remaining===1?'LAST_SEAT':'SPONSORED_MEAL'}>{campaign.remaining===1?'あと1人':'スポンサー飯'}</option><option value="CANCELLATION_SLOT">キャンセルで1席空いた</option></select></label>}
    <label>店舗からひとこと（任意）<input value={comment} onChange={event=>setComment(event.target.value)} maxLength={60} placeholder="例：今日は店長がおごります"/></label>
    <div className="x-post-preview"><strong>{campaign.businessName}</strong><p className="pre-wrap">{text}</p></div>
    <div className="campaign-og-mini"><span>PR / 提供</span><strong>{campaign.title}</strong><p>{campaign.restaurantName} · {campaign.area}</p>{campaign.benefit&&<b>{campaign.benefit}</b>}</div>
    <p className="muted break-all">投稿対象URL：{url}</p>
    {error&&<p className="error" role="alert">{error}</p>}
    <a className="btn dark-btn" href={intent} target="_blank" rel="noopener noreferrer" aria-disabled={pending} onClick={record}>{pending?'履歴を記録中…':'Xで宣伝する'}</a>
  </section>;
}
