export type EmptyStateInput = { area?: string; demandCount: number; nearbyArea?: string; nearbyCount: number; popularHour?: number; sampleSize: number; variant: string };
export function buildEmptyState(input: EmptyStateInput) {
  const safeDemand = input.demandCount >= 3 ? input.demandCount : null;
  const headline = safeDemand && input.variant === 'C'
    ? `${input.area ?? 'このエリア'}で${safeDemand}人が食事相手を探しています`
    : input.variant === 'B' ? `${input.area ?? 'このエリア'}で最初の募集を作りませんか？` : '今の条件では募集がありません。';
  return {
    headline,
    primaryLabel: input.variant === 'B' ? '最初の募集を作る' : '募集を作る',
    demandVisible: safeDemand !== null,
    nearbyText: input.nearbyArea && input.nearbyCount > 0 ? `近くの${input.nearbyArea}では${input.nearbyCount}件募集中です。` : null,
    timingText: input.popularHour !== undefined && input.sampleSize >= 10 ? `${input.popularHour}時以降に募集が増える傾向があります。` : null,
  };
}
