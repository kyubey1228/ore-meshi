import Link from 'next/link';
import { requirePageUser } from '@/server/auth';
import { MealForm } from '@/components/meal-form';
import { QuickPostForm } from '@/components/quick-post-form';
import { getAreaOptions, getFrequentPostingPattern, getMealPurposes } from '@/lib/data';
import { prisma } from '@/lib/prisma';

export const metadata={title:'飯を募集する'};

export default async function NewMeal({searchParams}:{searchParams:Promise<{mode?:string;repeat?:string}>}){
  const userId = await requirePageUser('/meals/new');
  const { mode, repeat } = await searchParams;
  const detailed = mode === 'detailed';
  const purposes = detailed ? await getMealPurposes() : [];
  const [frequentPattern, repeatMeal, areaOptions] = await Promise.all([
    !detailed ? getFrequentPostingPattern(userId) : Promise.resolve(null),
    repeat ? prisma.meal.findFirst({ where: { id: repeat, hostId: userId }, select: { area: true, genre: true, maxParticipants: true, description: true } }) : Promise.resolve(null),
    getAreaOptions(),
  ]);

  return <section className="section narrow">
    <span className="eyebrow orange">LET’S MAKE A PLAN</span><h1>誰か、飯いかん？</h1><p className="muted">食べたい気持ちを、気軽にひと声。</p>
    <div className="tag-pills">
      <Link className={`tag-pill${!detailed?' orange-pill':''}`} href="/meals/new">かんたん（30秒）</Link>
      <Link className={`tag-pill${detailed?' orange-pill':''}`} href="/meals/new?mode=detailed">くわしく作る</Link>
    </div>
    {detailed ? <MealForm purposes={purposes} areaOptions={areaOptions}/> : <QuickPostForm frequentPattern={frequentPattern} areaOptions={areaOptions} repeatDefaults={repeatMeal?{area:repeatMeal.area,genre:repeatMeal.genre??'',maxParticipants:repeatMeal.maxParticipants,description:repeatMeal.description??''}:undefined}/>}
  </section>;
}
