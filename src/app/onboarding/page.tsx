import { requirePageUser } from '@/server/auth';
import { OnboardingForm } from '@/components/onboarding-form';
import { GrowthTracker } from '@/components/growth-tracker';

export const metadata = { title: 'はじめまして' };

export default async function Onboarding() {
  await requirePageUser();
  return (
    <section className="section narrow">
      <GrowthTracker eventType="ONBOARDING_STARTED" loggedIn />
      <span className="eyebrow orange">WELCOME</span>
      <h1>あなたに合いそうな募集を見つけよう。</h1>
      <p className="muted">よく行くエリアや食べたいジャンルを教えてください。あとで変更もできます。</p>
      <OnboardingForm />
    </section>
  );
}
