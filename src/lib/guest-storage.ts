const FAVORITES_KEY = 'ore_guest_favorites';
const RECENT_KEY = 'ore_guest_recent';
const MAX_FAVORITES = 50;
const MAX_RECENT = 10;

function readList(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function writeList(key: string, list: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // ストレージが使えない場合は静かに諦める(プライベートブラウジング等)。
  }
}

export function getGuestFavorites(): string[] {
  return readList(FAVORITES_KEY);
}

export function isGuestFavorite(mealId: string): boolean {
  return getGuestFavorites().includes(mealId);
}

export function addGuestFavorite(mealId: string) {
  const list = getGuestFavorites();
  if (list.includes(mealId)) return;
  writeList(FAVORITES_KEY, [mealId, ...list].slice(0, MAX_FAVORITES));
}

export function removeGuestFavorite(mealId: string) {
  writeList(FAVORITES_KEY, getGuestFavorites().filter(id => id !== mealId));
}

export function clearGuestFavorites() {
  writeList(FAVORITES_KEY, []);
}

export function addRecentlyViewed(mealId: string) {
  const list = readList(RECENT_KEY).filter(id => id !== mealId);
  writeList(RECENT_KEY, [mealId, ...list].slice(0, MAX_RECENT));
}

export function getRecentlyViewed(): string[] {
  return readList(RECENT_KEY);
}
