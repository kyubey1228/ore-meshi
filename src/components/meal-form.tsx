'use client';
import { useState, useTransition } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TagSelector, type SelectableTag } from '@/components/tag-selector';
import { createMeal, updateMeal } from '@/server/actions/meals';
import { mealSchema } from '@/validators';
import { paymentLabels, candidateLabel } from '@/lib/format';
import { MealDraftPreview } from '@/components/meal-draft-preview';
import { AreaDatalist } from '@/components/area-datalist';
import type { z } from 'zod';

type Fields={title:string;area:string;budgetMin:number;budgetMax:number;maxParticipants:number;paymentType:'SPLIT'|'HOST_PAYS'|'GUEST_PAYS';restaurant:string;description:string;genre:string;alcohol:string;smoking:string;ageCondition:string;deadline:string;purposeIds:string[]};
type Candidate=z.infer<typeof mealSchema>['candidates'][number];
type CreatedMeal={href:string;title:string;area:string;when:string;budget:string;payment:string;remaining:number;purposeLabels:string[]};
const presets=[{name:'朝',start:'06:00',end:'10:00'},{name:'昼',start:'11:00',end:'14:00'},{name:'夕方',start:'15:00',end:'18:00'},{name:'夜',start:'18:00',end:'22:00'},{name:'深夜',start:'22:00',end:'02:00'}];

export function MealForm({initial,id,purposes,areaOptions=[]}:{initial?:Fields & {candidates:Candidate[]};id?:string;purposes:SelectableTag[];areaOptions?:string[]}){
  const {register,handleSubmit,control}=useForm<Fields>({defaultValues:initial??{title:'',area:'',budgetMin:1000,budgetMax:3000,maxParticipants:2,paymentType:'SPLIT',restaurant:'',description:'',genre:'',alcohol:'',smoking:'',ageCondition:'',deadline:'',purposeIds:[]}});
  const [date,setDate]=useState<Date>();
  const [start,setStart]=useState('18:00');
  const [end,setEnd]=useState('22:00');
  const [candidates,setCandidates]=useState<Candidate[]>(initial?.candidates??[]);
  const [purposeIds,setPurposeIds]=useState<string[]>(initial?.purposeIds??[]);
  const [createdMeal,setCreatedMeal]=useState<CreatedMeal|null>(null);
  const [error,setError]=useState('');
  const [pending,transition]=useTransition();
  const router=useRouter();
  const preview=useWatch({control});

  function addCandidate(startTime:string,endTime:string){
    if(!date){setError('先にカレンダーで日付を選んでください。');return;}
    const item={date:format(date,'yyyy-MM-dd'),startTime,endTime};
    if(candidates.length>=10){setError('候補日時は10件までです。');return;}
    if(candidates.some(candidate=>JSON.stringify(candidate)===JSON.stringify(item)))return;
    setCandidates([...candidates,item]);setError('');
  }

  function finishCreation(shareOnX:boolean){
    if(!createdMeal)return;
    if(shareOnX){
      const url=new URL(createdMeal.href,window.location.origin).toString();
      const params=new URLSearchParams({
        text:['誰か飯いこ','',createdMeal.when,`${createdMeal.area}で${createdMeal.title}`,'',`${createdMeal.budget} / ${createdMeal.payment} / あと${createdMeal.remaining}人`,createdMeal.purposeLabels.map(label=>`#${label.replace(/\s/g,'')}`).join(' '),'','#誰か飯いこ',url].filter((line,index,all)=>line!==''||all[index-1]!=='').join('\n'),
      });
      window.open(`https://x.com/intent/tweet?${params.toString()}`,'_blank','noopener,noreferrer');
    }
    router.push(createdMeal.href);router.refresh();
  }

  return <>
    <form className="panel meal-form" onSubmit={handleSubmit(values=>{
      const parsed=mealSchema.safeParse({...values,deadline:values.deadline?new Date(`${values.deadline}:00+09:00`).toISOString():'',candidates,purposeIds});
      if(!parsed.success){setError(parsed.error.issues.map(issue=>issue.message).join(' / '));return;}
      transition(async()=>{
        try{
          const result=id?await updateMeal({id,meal:parsed.data}):await createMeal(parsed.data);
          if(!result.ok||!result.href){setError(result.message);return;}
          if(id){router.push(result.href);router.refresh();return;}
          setCreatedMeal({href:result.href,title:parsed.data.title,area:parsed.data.area,when:candidateLabel(parsed.data.candidates[0]),budget:`${parsed.data.budgetMin.toLocaleString()}円〜${parsed.data.budgetMax.toLocaleString()}円`,payment:paymentLabels[parsed.data.paymentType],remaining:parsed.data.maxParticipants-1,purposeLabels:purposes.filter(purpose=>parsed.data.purposeIds.includes(purpose.id)).map(purpose=>purpose.label)});
        }catch{setError('送信できませんでした。もう一度お試しください。');}
      });
    })}>
      <fieldset disabled={pending}>
        <label>どんな飯にする？<input {...register('title')} required maxLength={80} placeholder="例：新宿でラーメン食いたい"/></label>
        <div className="two-col">
          <label>どこ<input {...register('area')} list="area-options" required maxLength={80} placeholder="例：新宿・代々木"/></label>
          <label>何人で？（自分を含む）<input {...register('maxParticipants',{valueAsNumber:true})} type="number" min={2} max={20} required/></label>
        </div>
        <AreaDatalist options={areaOptions}/>
        <div className="field-section">
          <h2>いつ行く？</h2>
          <p className="muted">日付を選んで、時間帯を押すだけ。候補は10件まで。時刻はすべて日本時間です。</p>
          <div className="calendar-layout">
            <Calendar mode="single" selected={date} onSelect={setDate} locale={ja}/>
            <div>
              <p>{date?format(date,'M月d日（E）',{locale:ja}):'日付を選んでください'}</p>
              <div className="preset-list">{presets.map(preset=><button className="chip" type="button" key={preset.name} onClick={()=>addCandidate(preset.start,preset.end)}>{preset.name}<small>{preset.start}〜{preset.end<preset.start?'翌':''}{preset.end}</small></button>)}</div>
              <details>
                <summary>時間を自分で決める</summary>
                <div className="two-col">
                  <label>開始<input type="time" value={start} onChange={event=>setStart(event.target.value)}/></label>
                  <label>終了<input type="time" value={end} onChange={event=>setEnd(event.target.value)}/></label>
                </div>
                <button className="btn secondary" type="button" onClick={()=>addCandidate(start,end)}>この日時を追加</button>
              </details>
            </div>
          </div>
          <ul className="candidate-list">{candidates.map((candidate,index)=><li key={`${candidate.date}/${candidate.startTime}/${candidate.endTime}`}><span>{candidateLabel(candidate)}</span><button type="button" className="text-link" aria-label={`${candidateLabel(candidate)}を削除`} onClick={()=>setCandidates(candidates.filter((_,current)=>index!==current))}>削除</button></li>)}</ul>
        </div>
        <div className="two-col">
          <label>予算の下限（円 / 人）<input {...register('budgetMin',{valueAsNumber:true})} required type="number" min={0} max={100000}/></label>
          <label>予算の上限（円 / 人）<input {...register('budgetMax',{valueAsNumber:true})} required type="number" min={0} max={100000}/></label>
        </div>
        <label>お会計は？<select {...register('paymentType')}>{Object.entries(paymentLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
        <div className="field-group"><h2>今日はどんな飯？</h2><p className="muted">目的に近いものを3個まで選べます（任意）。</p><TagSelector tags={purposes} selected={purposeIds} onChange={setPurposeIds} max={3} label="飯の目的を選択"/></div>
        <details>
          <summary>もうちょっと詳しく（任意）</summary>
          <label>お店<input {...register('restaurant')} maxLength={120} placeholder="決まっていれば"/></label>
          <label>一言コメント<textarea {...register('description')} maxLength={1000} rows={3} placeholder="どんな気分？ 何が食べたい？"/></label>
          <div className="two-col">{[{name:'genre',label:'食べたいジャンル'},{name:'alcohol',label:'お酒について'},{name:'smoking',label:'たばこについて'},{name:'ageCondition',label:'年齢条件'}].map(item=><label key={item.name}>{item.label}<input {...register(item.name as 'genre'|'alcohol'|'smoking'|'ageCondition')} maxLength={60}/></label>)}</div>
          <label>募集締切（日本時間）<input {...register('deadline')} type="datetime-local"/></label>
        </details>
        <p className="muted">最初に「一緒に行く」を押した相手の候補日時で日程が決まります。</p>
        <MealDraftPreview title={preview.title??''} area={preview.area??''} when={candidates.map(candidateLabel)} maxParticipants={preview.maxParticipants??2} budget={`${Number(preview.budgetMin||0).toLocaleString()}円〜${Number(preview.budgetMax||0).toLocaleString()}円 / 人`} payment={paymentLabels[preview.paymentType??'SPLIT']} restaurant={preview.restaurant} description={preview.description} genre={preview.genre??''}/>
        {error&&<p className="error" role="alert">{error}</p>}
        <button className="btn wide" disabled={pending}>{pending?'保存中…':id?'募集を更新する':'この飯、一緒に行く人！'}</button>
      </fieldset>
    </form>
    <Dialog open={Boolean(createdMeal)} onOpenChange={open=>{if(!open)finishCreation(false);}}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>募集をXに投稿しますか？</DialogTitle>
          <DialogDescription>募集を作成しました。「はい」を選ぶと、募集内容を確認できるXの投稿画面が開きます。</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button type="button" className="btn secondary" onClick={()=>finishCreation(false)}>いいえ</button>
          <button type="button" className="btn" onClick={()=>finishCreation(true)}>はい、Xで投稿する</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
