'use client';
import { useEffect } from 'react';
import { addRecentlyViewed } from '@/lib/guest-storage';

export function RecentlyViewedRecorder({ mealId }: { mealId: string }) {
  useEffect(() => { addRecentlyViewed(mealId); }, [mealId]);
  return null;
}
