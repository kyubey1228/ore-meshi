import { ImageResponse } from 'next/og';
import { getMealShareData } from '@/lib/data';
import { candidateLabel, paymentLabels, yen } from '@/lib/format';
import { remainingSlots, truncate } from '@/lib/social';

export const alt='「俺は誰かと飯が食いたい！」の飯募集';
export const size={width:1200,height:630};
export const contentType='image/png';
export const dynamic='force-dynamic';

const statusCopy={OPEN:'誰か来い',MATCHED:'飯、決まった。',CLOSED:'募集は終了しました',CANCELLED:'募集はキャンセルされました'} as const;

export default async function Image({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const meal=await getMealShareData(id);
  if(!meal)return new ImageResponse(<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:'#faf8f3',color:'#25231f',fontSize:54,fontWeight:800}}>飯募集が見つかりません</div>,size);
  const remaining=remainingSlots(meal);
  const when=meal.candidates[0]?candidateLabel(meal.candidates[0]):'日時調整中';
  const state=meal.status==='OPEN'&&remaining===1?'🔥 あと1人！':meal.status==='OPEN'?`あと${remaining}人`:meal.status==='MATCHED'?`${meal._count.joinRequests+1}人で行きます`:'';
  return new ImageResponse(
    <div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',background:'#faf8f3',color:'#25231f',padding:'54px 64px',border:'18px solid #f05a28'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:25,fontWeight:800}}>
        <span>🍚 俺は誰かと飯が食いたい！</span><span style={{color:'#f05a28'}}>#誰か飯いこ</span>
      </div>
      <div style={{display:'flex',flex:1,flexDirection:'column',justifyContent:'center'}}>
        <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:20}}>
          {meal.host.image
            ?<img src={meal.host.image} alt="" width="58" height="58" style={{borderRadius:999,border:'3px solid #25231f'}}/>
            :<div style={{width:58,height:58,borderRadius:999,background:'#25231f',color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,fontWeight:900}}>{meal.host.displayName.slice(0,1)}</div>}
          <div style={{display:'flex',flexDirection:'column'}}><span style={{fontSize:27,fontWeight:900}}>{truncate(meal.host.displayName,24)}さんの募集</span><span style={{fontSize:21,color:'#5f5a52'}}>𝕏 @{truncate(meal.host.twitterUsername,26)}</span></div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:22,color:'#b43e14',fontSize:32,fontWeight:800}}><span>{statusCopy[meal.status]}</span>{state&&<span style={{background:'#fff0e8',borderRadius:999,padding:'5px 18px'}}>{state}</span>}</div>
        <div style={{fontSize:61,lineHeight:1.18,fontWeight:900,marginTop:18}}>{truncate(meal.title,42)}</div>
        <div style={{display:'flex',gap:28,fontSize:31,marginTop:25}}><span>{truncate(when,34)}</span><span>📍 {truncate(meal.area,24)}</span></div>
        <div style={{display:'flex',gap:22,fontSize:27,marginTop:20}}><span>{yen(meal.budgetMin)}〜{yen(meal.budgetMax)}</span><span>{paymentLabels[meal.paymentType]}</span>{meal.purposes.slice(0,3).map(({purpose})=><span key={purpose.label} style={{color:'#b43e14'}}>#{truncate(purpose.label,12)}</span>)}</div>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:25,fontWeight:700}}><span>募集詳細を見て参加する →</span><span>ore-meshi</span></div>
    </div>,
    size,
  );
}
