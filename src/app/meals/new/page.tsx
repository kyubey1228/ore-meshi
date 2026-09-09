import { requirePageUser } from '@/server/auth';
import { MealForm } from '@/components/meal-form';
export const metadata={title:'飯を募集する'};
export default async function NewMeal(){await requirePageUser();return <section className="section narrow"><span className="eyebrow orange">LET’S MAKE A PLAN</span><h1>誰か、飯いかん？</h1><p className="muted">食べたい気持ちを、気軽にひと声。</p><MealForm/></section>;}
