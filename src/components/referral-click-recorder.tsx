'use client';
import { useEffect } from 'react';
import { recordReferralClick } from '@/server/actions/referral';

export function ReferralClickRecorder({ referralCode, mealId }: { referralCode: string; mealId?: string }) {
  useEffect(() => {
    void recordReferralClick({ referralCode, mealId, source: mealId ? 'meal_share' : 'direct' });
  }, [referralCode, mealId]);
  return null;
}
