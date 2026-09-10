import { candidateLabel, paymentLabels, yen } from '@/lib/format';

type ShareMeal={
  id:string;title:string;area:string;budgetMin:number;budgetMax:number;paymentType:keyof typeof paymentLabels;
  maxParticipants:number;status:string;candidates:{date:Date;startTime:string;endTime:string}[];
  purposes:{purpose:{label:string}}[];_count:{joinRequests:number};
};

export function truncate(value:string,max:number){return value.length<=max?value:`${value.slice(0,Math.max(0,max-1))}…`;}
export function remainingSlots(meal:{maxParticipants:number;_count:{joinRequests:number}}){return Math.max(0,meal.maxParticipants-(meal._count.joinRequests+1));}
export function appUrl(){return (process.env.NEXT_PUBLIC_APP_URL||process.env.NEXTAUTH_URL||'http://localhost:3000').replace(/\/$/,'');}
export function mealUrl(id:string){return `${appUrl()}/meals/${encodeURIComponent(id)}`;}

export function mealShareText(meal:ShareMeal){
  const remaining=remainingSlots(meal);
  const when=meal.candidates[0]?candidateLabel(meal.candidates[0]):'日時調整中';
  const purpose=meal.purposes.slice(0,2).map(({purpose})=>`#${purpose.label.replace(/\s/g,'')}`).join(' ');
  const open=meal.status==='OPEN';
  return [
    open?'誰か飯いこ':meal.status==='CANCELLED'?'この飯募集はキャンセルされました':'この飯募集は終了しました',
    '',
    truncate(when,30),
    `${truncate(meal.area,24)}で${truncate(meal.title,42)}`,
    '',
    `${yen(meal.budgetMin)}〜${yen(meal.budgetMax)} / ${paymentLabels[meal.paymentType]}${open?` / ${remaining===1?'あと1人':`あと${remaining}人`}`:''}`,
    purpose,
    '',
    '#誰か飯いこ',
    mealUrl(meal.id),
  ].filter((line,index,all)=>line!==''||all[index-1]!== '').join('\n');
}

export function matchedShareText(meal:Pick<ShareMeal,'id'|'title'|'area'|'candidates'>,participantCount:number){
  const when=meal.candidates[0]?candidateLabel(meal.candidates[0]):'日時調整中';
  return ['飯、決まった。','',truncate(when,30),`${truncate(meal.area,24)}で${truncate(meal.title,42)}`,'',`${participantCount}人で飯に行くことになりました。`,'','#誰か飯いこ',mealUrl(meal.id)].join('\n');
}

export function shareTextForViewer(text:string,viewerIsHost:boolean,hostDisplayName:string){
  if(viewerIsHost)return text;
  return `${truncate(hostDisplayName.trim()||'募集者',24)}さんが #誰か飯いこ してるよ！\n\n${text}`;
}

export function xIntent(text:string){return `https://x.com/intent/tweet?${new URLSearchParams({text}).toString()}`;}

// 共有チャンネルごとにutm_source/mediumを付けたURLを発行する。着地先ページは既にGrowthTrackerを
// mountしておりUTMをCookie化して以降のsignup計測まで引き継ぐため、新しいAttribution基盤を作らず
// ここでURLを作るだけで既存の計測に乗る(meal-share-actions.tsx等から利用)。
export function withUtm(url:string,source:string,medium:string,campaign='meal_share'){
  const u=new URL(url);
  u.searchParams.set('utm_source',source);
  u.searchParams.set('utm_medium',medium);
  u.searchParams.set('utm_campaign',campaign);
  return u.toString();
}
