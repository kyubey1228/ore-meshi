export type QuickWhen = 'tonight' | 'tomorrow' | 'lunch';

const WEEKDAY_MAP: Record<string, number> = { '日': 0, '月': 1, '火': 2, '水': 3, '木': 4, '金': 5, '土': 6 };

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

function weekdayOf(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function nextWeekday(dateStr: string, targetDow: number, includeToday: boolean) {
  const currentDow = weekdayOf(dateStr);
  let diff = (targetDow - currentDow + 7) % 7;
  if (diff === 0 && !includeToday) diff = 7;
  return addDays(dateStr, diff);
}

function nextWeekdayInWorkweek(fromDateStr: string, includeToday: boolean) {
  let d = fromDateStr;
  if (includeToday) { const dow = weekdayOf(d); if (dow >= 1 && dow <= 5) return d; }
  do { d = addDays(d, 1); } while (weekdayOf(d) === 0 || weekdayOf(d) === 6);
  return d;
}

export function buildCandidateForTimeRange(timeRange: string | null | undefined): { date: string; startTime: string; endTime: string } {
  const now = jstNowParts();
  if (timeRange === 'TONIGHT') return buildQuickCandidate('tonight');
  if (timeRange === 'THIS_WEEKEND') return { date: nextWeekday(now.dateStr, 6, true), startTime: '19:00', endTime: '21:00' };
  return buildQuickCandidate('tomorrow');
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

// 「今日19時」「明日夜」「金曜20時」「今週末」「平日夜」のような自由文を日時候補へ変換する。
// 解釈できない場合はnullを返し、呼び出し側は既存のチップ選択にフォールバックする。
export function parseFreeTextWhen(raw: string): { date: string; startTime: string; endTime: string } | null {
  const text = raw.trim();
  if (!text) return null;
  const now = jstNowParts();

  const timeMatch = text.match(/(\d{1,2})\s*[時:](\d{2})?/);
  let hour: number | null = null;
  let minute = 0;
  if (timeMatch) {
    const h = Number(timeMatch[1]);
    if (h >= 0 && h <= 23) { hour = h; minute = timeMatch[2] ? Number(timeMatch[2]) : 0; }
  }

  const weekdayChar = Object.keys(WEEKDAY_MAP).find(w => text.includes(`${w}曜`));
  const isToday = /今日/.test(text);
  const isTonight = /今夜|今晩/.test(text);
  const isTomorrow = /明日|あした/.test(text);
  const isWeekend = /週末/.test(text);
  const isWeekday = /平日/.test(text);
  const isLunch = /昼|ランチ|お昼/.test(text);

  let dateStr: string;
  if (weekdayChar) {
    dateStr = nextWeekday(now.dateStr, WEEKDAY_MAP[weekdayChar], true);
  } else if (isTomorrow) {
    dateStr = addDays(now.dateStr, 1);
  } else if (isWeekend) {
    dateStr = nextWeekday(now.dateStr, 6, true);
  } else if (isWeekday) {
    dateStr = nextWeekdayInWorkweek(now.dateStr, hour === null || now.hour < (hour ?? 19));
  } else if (isToday || isTonight) {
    dateStr = now.dateStr;
  } else {
    return null;
  }

  if (hour === null) hour = isLunch ? 12 : 19;
  const startTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  const endHour = (hour + 2) % 24;
  const endTime = `${String(endHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  return { date: dateStr, startTime, endTime };
}
