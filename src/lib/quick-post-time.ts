export type QuickWhen = 'tonight' | 'tomorrow' | 'lunch';

function jstNowParts() {
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map(p => [p.type, p.value]));
  return { dateStr: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) % 24, minute: Number(parts.minute) };
}

function addDays(dateStr: string, days: number) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

export function buildQuickCandidate(when: QuickWhen): { date: string; startTime: string; endTime: string } {
  const now = jstNowParts();
  if (when === 'tonight') {
    const today = now.hour < 19;
    return { date: today ? now.dateStr : addDays(now.dateStr, 1), startTime: '19:00', endTime: '21:00' };
  }
  if (when === 'lunch') {
    const today = now.hour < 11;
    return { date: today ? now.dateStr : addDays(now.dateStr, 1), startTime: '12:00', endTime: '14:00' };
  }
  return { date: addDays(now.dateStr, 1), startTime: '19:00', endTime: '21:00' };
}
