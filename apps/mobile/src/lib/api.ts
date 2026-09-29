const DEFAULT_API_URL = 'https://ore-meshi.lolipop-now.app';
export const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL || DEFAULT_API_URL).replace(/\/$/, '');
const API_URL = (process.env.EXPO_PUBLIC_API_URL || WEB_URL).replace(/\/$/, '');
export type Person = { id?: string; displayName: string; twitterUsername?: string; image?: string | null; bio?: string | null };
export type Candidate = { id?: string; date: string; startTime: string; endTime: string };
export type Meal = { id: string; title: string; description: string | null; area: string; restaurant: string | null; genre: string | null; alcohol?: string | null; smoking?: string | null; ageCondition?: string | null; deadline?: string | null; budgetMin: number; budgetMax: number; paymentType: 'SPLIT' | 'HOST_PAYS' | 'GUEST_PAYS'; maxParticipants: number; acceptedParticipants: number; candidateCount?: number; candidate?: Candidate | null; candidates?: Candidate[]; purposes: { id: string; slug: string; label: string }[]; host: Person; status?: string; sponsor?: { sponsorName: string; benefit: string } | null };
export type Article = { id: string; title: string; slug: string; description: string; content?: string; coverImage: string | null; coverImageAlt: string | null; publishedAt: string | null; updatedAt?: string; readingTime: number; category: { name: string; slug: string } | null; author: { displayName: string } };
export type AuthUser = { id: string; displayName: string; twitterUsername: string; image: string | null; bio: string | null; onboardingCompletedAt: string | null };
async function request<T>(path: string, signal?: AbortSignal): Promise<T> { const response = await fetch(`${API_URL}/api/mobile/v1${path}`, { signal }); if (!response.ok) throw new Error(response.status === 404 ? '見つかりませんでした。' : '読み込みに失敗しました。'); return response.json() as Promise<T>; }
export const api = { meals: (area = '', signal?: AbortSignal) => request<{ items: Meal[] }>(`/meals${area ? `?area=${encodeURIComponent(area)}` : ''}`, signal), meal: (id: string, signal?: AbortSignal) => request<{ item: Meal }>(`/meals/${encodeURIComponent(id)}`, signal), articles: (signal?: AbortSignal) => request<{ items: Article[] }>('/articles', signal), article: (slug: string, signal?: AbortSignal) => request<{ item: Article }>(`/articles/${encodeURIComponent(slug)}`, signal) };

export async function exchangeAuthCode(code: string, codeVerifier: string) {
  const response = await fetch(`${API_URL}/api/mobile/v1/auth/exchange`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, codeVerifier }) });
  if (!response.ok) throw new Error('アプリのログイン処理を完了できませんでした。');
  return response.json() as Promise<{ accessToken: string; expiresAt: string }>;
}

export async function authenticatedSession(accessToken: string) {
  const response = await fetch(`${API_URL}/api/mobile/v1/auth/session`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) return null;
  return response.json() as Promise<{ user: AuthUser; expiresAt: string }>;
}

export async function revokeSession(accessToken: string) {
  await fetch(`${API_URL}/api/mobile/v1/auth/session`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } });
}
