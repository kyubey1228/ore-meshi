'use client';
import { useEffect } from 'react';
import { mergeGuestFavorites } from '@/server/actions/favorites';
import { getGuestFavorites, clearGuestFavorites } from '@/lib/guest-storage';
import { trackGrowthEvent } from '@/components/growth-tracker';

export function FavoritesMerge() {
  useEffect(() => {
    const mealIds = getGuestFavorites();
    if (mealIds.length === 0) return;
    void mergeGuestFavorites({ mealIds }).then(result => {
      if (result.ok) {
        clearGuestFavorites();
        trackGrowthEvent('GUEST_FAVORITES_MERGED', { loggedIn: true });
      }
    });
  }, []);
  return null;
}
