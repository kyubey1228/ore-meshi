'use client';
import { useState, useSyncExternalStore, useTransition } from 'react';
import { Bookmark } from 'lucide-react';
import { addFavorite, removeFavorite } from '@/server/actions/favorites';
import { addGuestFavorite, isGuestFavorite, removeGuestFavorite } from '@/lib/guest-storage';
import { trackGrowthEvent } from '@/components/growth-tracker';

function subscribeStorage(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

export function FavoriteButton({ mealId, loggedIn, initialFavorite = false }: { mealId: string; loggedIn: boolean; initialFavorite?: boolean }) {
  const guestFavorite = useSyncExternalStore(subscribeStorage, () => isGuestFavorite(mealId), () => false);
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const favorite = optimistic ?? (loggedIn ? initialFavorite : guestFavorite);
  const [pending, start] = useTransition();

  function toggle() {
    const next = !favorite;
    setOptimistic(next);
    trackGrowthEvent(next ? 'GUEST_FAVORITE_ADDED' : 'GUEST_FAVORITE_REMOVED', { recruitmentId: mealId, loggedIn });
    if (!loggedIn) {
      if (next) addGuestFavorite(mealId); else removeGuestFavorite(mealId);
      return;
    }
    start(async () => {
      if (next) await addFavorite({ mealId }); else await removeFavorite({ mealId });
    });
  }

  return (
    <button className="btn secondary favorite-button" type="button" onClick={toggle} disabled={pending} aria-pressed={favorite}>
      <Bookmark size={17} fill={favorite ? 'currentColor' : 'none'} />{favorite ? 'あとで見る 登録済み' : 'あとで見る'}
    </button>
  );
}
