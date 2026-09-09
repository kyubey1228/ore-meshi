export const paymentLabels = { SPLIT: '割り勘', HOST_PAYS: '俺が奢る', GUEST_PAYS: '奢ってほしい' } as const;
export const mealStatusLabels = { OPEN: '募集中', MATCHED: '飯決定！', CLOSED: '募集終了', CANCELLED: '募集キャンセル' } as const;
export const matchStatusLabels = { ACTIVE: '参加予定', COMPLETED: '飯終了', CANCELLED: '飯の予定をキャンセル' } as const;
export const requestStatusLabels = { PENDING: '返事待ち', ACCEPTED: '一緒に行く', REJECTED: '今回はごめん', CANCELLED: '取り下げ済み' } as const;
export function dateLabel(date: Date | string) { return new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', weekday: 'short' }).format(new Date(date)); }
export function dateTimeLabel(date: Date | string) { return new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(date)); }
export function candidateLabel(c: {date: Date | string; startTime: string; endTime: string}) { return `${dateLabel(c.date)} ${c.startTime}〜${c.endTime <= c.startTime ? '翌' : ''}${c.endTime}`; }
export function yen(n: number) { return `¥${n.toLocaleString('ja-JP')}`; }
