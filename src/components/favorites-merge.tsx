'use client';
import { useEffect } from 'react';
import { mergeGuestFavorites } from '@/server/actions/favorites';
import { getGuestFavorites, clearGuestFavorites } from '@/lib/guest-storage';
import { trackGrowthEvent } from '@/components/growth-tracker';
import { loadAccountState } from '@/components/auth-nav-state';

export function FavoritesMerge() {
  useEffect(() => {
    const mealIds = getGuestFavorites();
    if (mealIds.length === 0) return;
    // ヘッダーの認証確認を共有し、ゲスト閲覧のたびにServer Actionを送らない。
    void loadAccountState().then(account => account.signedIn ? mergeGuestFavorites({ mealIds }) : null).then(result => {
      if (result?.ok) {
        clearGuestFavorites();
        trackGrowthEvent('GUEST_FAVORITES_MERGED', { loggedIn: true });
      }
    }).catch(() => { /* 次のページ読込時に再試行するためローカル保存を残す。 */ });
  }, []);
  return null;
}
