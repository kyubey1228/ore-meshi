import Link from 'next/link';
import { requirePageUser } from '@/server/auth';
import { MealForm } from '@/components/meal-form';
import { QuickPostForm } from '@/components/quick-post-form';
import { getMealPurposes } from '@/lib/data';

export const metadata={title:'飯を募集する'};

export default async function NewMeal({searchParams}:{searchParams:Promise<{mode?:string}>}){
  await requirePageUser('/meals/new');
  const { mode } = await searchParams;
  const detailed = mode === 'detailed';
  const purposes = detailed ? await getMealPurposes() : [];

  return <section className="section narrow">
    <span className="eyebrow orange">LET’S MAKE A PLAN</span><h1>誰か、飯いかん？</h1><p className="muted">食べたい気持ちを、気軽にひと声。</p>
    <div className="tag-pills">
      <Link className={`tag-pill${!detailed?' orange-pill':''}`} href="/meals/new">かんたん（30秒）</Link>
      <Link className={`tag-pill${detailed?' orange-pill':''}`} href="/meals/new?mode=detailed">くわしく作る</Link>
    </div>
    {detailed ? <MealForm purposes={purposes}/> : <QuickPostForm/>}
  </section>;
}
