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
