import { redirect } from 'next/navigation';
import { currentBusinessMembership } from '@/server/business';
import { requirePageUser } from '@/server/auth';
import { BusinessOnboardingForm } from '@/components/business-onboarding-form';
export default async function BusinessOnboarding(){await requirePageUser();if(await currentBusinessMembership())redirect('/business/dashboard');return <section className="section narrow"><span className="eyebrow orange">FOR BUSINESS</span><h1>店舗から飯を呼ぼう。</h1><p className="muted">店舗情報を登録すると、キャンペーンをXへ手動で共有できます。</p><BusinessOnboardingForm/></section>;}
