'use client';
import { useEffect } from 'react';
export function ReferralTracker({kind,id,utmSource,utmMedium,utmCampaign,referralKey}:{kind:string;id:string;utmSource?:string;utmMedium?:string;utmCampaign?:string;referralKey?:string}){
  useEffect(()=>{if(utmSource!=='x')return;void fetch('/api/referrals',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({kind,id,utmSource,utmMedium,utmCampaign,ref:referralKey}),keepalive:true});},[kind,id,utmSource,utmMedium,utmCampaign,referralKey]);
  return null;
}
