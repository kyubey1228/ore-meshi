import type { Candidate, Meal } from './api';
export const yen = (value: number) => `${value.toLocaleString('ja-JP')}円`;
export const paymentLabels: Record<Meal['paymentType'], string> = { SPLIT: '割り勘', HOST_PAYS: '募集者が払う', GUEST_PAYS: '参加者が払う' };
export function candidateLabel(candidate?: Candidate | null) { if (!candidate) return '日程調整中'; const date = new Date(candidate.date); return `${date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' })} ${candidate.startTime}〜${candidate.endTime}`; }
export function dateLabel(value: string | null) { return value ? new Date(value).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }) : ''; }
