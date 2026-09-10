export const TIME_RANGES = [
  { value: 'TONIGHT', label: '今夜' },
  { value: 'TOMORROW', label: '明日' },
  { value: 'THIS_WEEKEND', label: '今週末' },
  { value: 'THIS_WEEK', label: '今週中' },
] as const;

export type TimeRange = typeof TIME_RANGES[number]['value'];
export const TIME_RANGE_VALUES = TIME_RANGES.map(t => t.value) as [TimeRange, ...TimeRange[]];

export function timeRangeLabel(value: string | null) {
  return TIME_RANGES.find(t => t.value === value)?.label ?? '未指定';
}

export function clusterKey(area: string, genre: string | null, timeRange: string | null) {
  return `${area.trim().toLowerCase()}|${(genre ?? '').trim().toLowerCase()}|${timeRange ?? ''}`;
}

export function expiresAtFor(timeRange: TimeRange | null | undefined): Date {
  const days = timeRange === 'TONIGHT' ? 1 : timeRange === 'TOMORROW' ? 2 : timeRange === 'THIS_WEEKEND' || timeRange === 'THIS_WEEK' ? 7 : 3;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export const DEMAND_CLUSTER_THRESHOLD = 3;

function jstDateStr(d: Date) {
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' });
  const parts = Object.fromEntries(fmt.formatToParts(d).map(p => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

// 募集の最速候補日がどのTIME_RANGEバケットに属するかを判定する(JST基準)。どれにも当てはまらなければnull。
export function classifyMealTimeRange(candidateDate: Date): TimeRange | null {
  const today = jstDateStr(new Date());
  const target = jstDateStr(candidateDate);
  if (target === today) return 'TONIGHT';
  const tomorrow = jstDateStr(new Date(Date.now() + 24 * 60 * 60 * 1000));
  if (target === tomorrow) return 'TOMORROW';
  const daysUntil = Math.round((new Date(`${target}T00:00:00+09:00`).getTime() - new Date(`${today}T00:00:00+09:00`).getTime()) / (24 * 60 * 60 * 1000));
  if (daysUntil < 0) return null;
  if (daysUntil <= 7) {
    const dow = new Date(`${target}T00:00:00+09:00`).getUTCDay();
    if (dow === 0 || dow === 6) return 'THIS_WEEKEND';
    return 'THIS_WEEK';
  }
  return null;
}

// area/genre/timeRange/人数で募集とDemand Intentが近似一致するかを判定する(完全一致ではなくゆるい一致)。
export function intentMatchesMeal(intent: { area: string; genre: string | null; timeRange: string | null; desiredGroupSize: number }, meal: { area: string; genre: string | null; maxParticipants: number; earliestCandidateDate: Date | null }): boolean {
  const a1 = intent.area.trim().toLowerCase();
  const a2 = meal.area.trim().toLowerCase();
  if (!a1.includes(a2) && !a2.includes(a1)) return false;
  if (intent.genre && meal.genre && intent.genre.trim().toLowerCase() !== meal.genre.trim().toLowerCase()) return false;
  if (intent.desiredGroupSize > meal.maxParticipants) return false;
  if (intent.timeRange && meal.earliestCandidateDate) {
    const mealBucket = classifyMealTimeRange(meal.earliestCandidateDate);
    if (mealBucket && mealBucket !== intent.timeRange) return false;
  }
  return true;
}
