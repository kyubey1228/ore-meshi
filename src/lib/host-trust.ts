export type HostTrustStats = {
  hostedCount: number;
  completedCount: number;
  bio: string | null;
  image: string | null;
  diningTypeCount: number;
};

export type TrustBadge = { label: string; icon: string };

export function computeHostTrustBadges(stats: HostTrustStats): TrustBadge[] {
  const badges: TrustBadge[] = [];
  if (stats.hostedCount >= 1) badges.push({ label: `過去${stats.hostedCount}回開催`, icon: '📅' });
  if (stats.completedCount >= 1) badges.push({ label: '飯を成立させた実績あり', icon: '🤝' });
  if (stats.bio && stats.image && stats.diningTypeCount > 0) badges.push({ label: 'プロフィール充実', icon: '✅' });
  return badges;
}
