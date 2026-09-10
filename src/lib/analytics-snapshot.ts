export const ANALYTICS_TIMEZONE = 'Asia/Tokyo';
export const ANALYTICS_SCHEMA_VERSION = 1;

export type AnalyticsPeriod = {
  start: Date;
  end: Date;
  asOfDate: Date;
  windowDays: number;
  timezone: typeof ANALYTICS_TIMEZONE;
};

export function createTokyoDayPeriod(date = new Date()): AnalyticsPeriod {
  const text = new Intl.DateTimeFormat('en-CA', { timeZone: ANALYTICS_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  const start = new Date(`${text}T00:00:00+09:00`);
  return { start, end: new Date(start.getTime() + 86_400_000), asOfDate: new Date(`${text}T00:00:00.000Z`), windowDays: 1, timezone: ANALYTICS_TIMEZONE };
}

export function createTokyoWindowPeriod(days: number, date = new Date()): AnalyticsPeriod {
  if (!Number.isInteger(days) || days < 1 || days > 366) throw new Error('集計期間は1〜366日の整数で指定してください。');
  const day = createTokyoDayPeriod(date);
  return { ...day, start: new Date(day.end.getTime() - days * 86_400_000), windowDays: days };
}

export type GrowthRow = { eventType: string };
export type MealRow = { area: string; genre: string | null; status: string; maxParticipants: number; demandClusterKey: string | null; createdAt: Date; firstJoinAt: Date | null; matchedAt: Date | null };
export type MatchedMealRow = { area: string; genre: string | null; matchedAt: Date };
export type CompletedMatchRow = { completedAt: Date | null; meal: { area: string; genre: string | null }; participants: { userId: string }[] };
export type DemandRow = { area: string; genre: string | null; status: string; createdAt: Date };
export type NotificationRow = { type: string; readAt: Date | null; clickedAt: Date | null };

export type AnalyticsSourceRows = {
  growthEvents: GrowthRow[];
  meals: MealRow[];
  matchedMeals: MatchedMealRow[];
  completedMatches: CompletedMatchRow[];
  demandIntents: DemandRow[];
  notifications: NotificationRow[];
};

function countEvents(rows: GrowthRow[], eventType: string) {
  return rows.reduce((count, row) => count + Number(row.eventType === eventType), 0);
}

function basePeriod(period: AnalyticsPeriod, generatedAt: Date) {
  return { periodStart: period.start, periodEnd: period.end, timezone: period.timezone, generatedAt };
}

export function buildDailyMetricsPayload(period: AnalyticsPeriod, rows: AnalyticsSourceRows, generatedAt = new Date()) {
  const notificationTypeMetrics: Record<string, { sent: number; opened: number; clicked: number }> = {};
  for (const notification of rows.notifications) {
    const metric = notificationTypeMetrics[notification.type] ?? { sent: 0, opened: 0, clicked: 0 };
    metric.sent++;
    if (notification.readAt) metric.opened++;
    if (notification.clickedAt) metric.clicked++;
    notificationTypeMetrics[notification.type] = metric;
  }
  const dinerIds = new Set(rows.completedMatches.flatMap(match => match.participants.map(participant => participant.userId)));
  return {
    ...basePeriod(period, generatedAt),
    date: period.asOfDate,
    signupStarted: countEvents(rows.growthEvents, 'SIGNUP_STARTED'),
    signupCompleted: countEvents(rows.growthEvents, 'SIGNUP_COMPLETED'),
    joinIntentCreated: countEvents(rows.growthEvents, 'JOIN_INTENT_CREATED'),
    joinAfterSignupCompleted: countEvents(rows.growthEvents, 'JOIN_AFTER_SIGNUP_COMPLETED'),
    recruitmentShareX: countEvents(rows.growthEvents, 'RECRUITMENT_SHARE_X'),
    recruitmentShareLine: countEvents(rows.growthEvents, 'RECRUITMENT_SHARE_LINE'),
    recruitmentUrlCopied: countEvents(rows.growthEvents, 'RECRUITMENT_URL_COPIED'),
    referralOpened: countEvents(rows.growthEvents, 'REFERRAL_LINK_OPENED'),
    referralSignupCompleted: countEvents(rows.growthEvents, 'REFERRAL_SIGNUP_COMPLETED'),
    quickPostStarted: countEvents(rows.growthEvents, 'QUICK_POST_STARTED'),
    quickPostCompleted: countEvents(rows.growthEvents, 'QUICK_POST_COMPLETED'),
    mealsCreated: rows.meals.length,
    mealsMatched: rows.meals.filter(meal => meal.status === 'MATCHED').length,
    matchesCompleted: rows.completedMatches.length,
    uniqueDiners: dinerIds.size,
    demandIntentsCreated: rows.demandIntents.length,
    demandIntentsMatched: rows.demandIntents.filter(intent => intent.status === 'MATCHED').length,
    demandRecruitments: rows.meals.filter(meal => meal.demandClusterKey !== null).length,
    demandMealsMatched: rows.meals.filter(meal => meal.demandClusterKey !== null && meal.status === 'MATCHED').length,
    notificationsSent: rows.notifications.length,
    notificationsOpened: rows.notifications.filter(notification => notification.readAt !== null).length,
    notificationsClicked: rows.notifications.filter(notification => notification.clickedAt !== null).length,
    notificationTypeMetrics,
  };
}

type AreaPayload = ReturnType<typeof emptyArea>;
function emptyArea(area: string, genre: string) {
  return { area, genre, demandIntents: 0, mealsCreated: 0, mealsMatched: 0, matchesCompleted: 0, estimatedParticipants: 0 };
}
function dimensionKey(area: string, genre: string | null) { return `${area}\u0000${genre ?? '未指定'}`; }

export function buildAreaDemandPayloads(period: AnalyticsPeriod, rows: AnalyticsSourceRows, generatedAt = new Date()) {
  const values = new Map<string, AreaPayload>();
  const get = (area: string, genre: string | null) => {
    const key = dimensionKey(area, genre);
    let value = values.get(key);
    if (!value) { value = emptyArea(area, genre ?? '未指定'); values.set(key, value); }
    return value;
  };
  for (const intent of rows.demandIntents) get(intent.area, intent.genre).demandIntents++;
  for (const meal of rows.meals) {
    const value = get(meal.area, meal.genre);
    value.mealsCreated++;
    if (meal.matchedAt) { value.mealsMatched++; value.estimatedParticipants += meal.maxParticipants; }
  }
  for (const match of rows.completedMatches) get(match.meal.area, match.meal.genre).matchesCompleted++;
  return [...values.values()].map(value => ({ ...basePeriod(period, generatedAt), date: period.asOfDate, ...value }));
}

function tokyoParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ANALYTICS_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? '';
  const dateText = `${value('year')}-${value('month')}-${value('day')}`;
  const hour = Number(value('hour'));
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(value('weekday'));
  const bucketStart = new Date(`${dateText}T${String(hour).padStart(2, '0')}:00:00+09:00`);
  return { bucketStart, localDate: new Date(`${dateText}T00:00:00.000Z`), localWeekday: weekday, localHour: hour };
}

export function buildHourlyDemandPayloads(period: AnalyticsPeriod, rows: AnalyticsSourceRows, generatedAt = new Date()) {
  const values = new Map<string, ReturnType<typeof emptyArea> & ReturnType<typeof tokyoParts>>();
  const get = (at: Date, area: string, genre: string | null) => {
    const time = tokyoParts(at);
    const key = `${time.bucketStart.toISOString()}\u0000${dimensionKey(area, genre)}`;
    let value = values.get(key);
    if (!value) { value = { ...emptyArea(area, genre ?? '未指定'), ...time }; values.set(key, value); }
    return value;
  };
  for (const intent of rows.demandIntents) get(intent.createdAt, intent.area, intent.genre).demandIntents++;
  for (const meal of rows.meals) {
    const value = get(meal.createdAt, meal.area, meal.genre);
    value.mealsCreated++;
  }
  for (const meal of rows.matchedMeals) get(meal.matchedAt, meal.area, meal.genre).mealsMatched++;
  for (const match of rows.completedMatches) if (match.completedAt) get(match.completedAt, match.meal.area, match.meal.genre).matchesCompleted++;
  return [...values.values()].map(value => ({
    bucketStart: value.bucketStart, localDate: value.localDate, localWeekday: value.localWeekday, localHour: value.localHour,
    area: value.area, genre: value.genre, demandIntents: value.demandIntents, mealsCreated: value.mealsCreated,
    mealsMatched: value.mealsMatched, matchesCompleted: value.matchesCompleted, timezone: period.timezone, generatedAt,
  }));
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function buildAnalyticsSnapshotPayload(period: AnalyticsPeriod, rows: AnalyticsSourceRows, generatedAt = new Date()) {
  const firstJoinHours = rows.meals.flatMap(meal => meal.firstJoinAt ? [(meal.firstJoinAt.getTime() - meal.createdAt.getTime()) / 3_600_000] : []);
  const matchHours = rows.meals.flatMap(meal => meal.matchedAt ? [(meal.matchedAt.getTime() - meal.createdAt.getTime()) / 3_600_000] : []);
  const daily = buildDailyMetricsPayload(period, rows, generatedAt);
  const dailyTotals: Record<string, unknown> = { ...daily };
  delete dailyTotals.date;
  delete dailyTotals.timezone;
  delete dailyTotals.periodStart;
  delete dailyTotals.periodEnd;
  delete dailyTotals.generatedAt;
  return {
    snapshotType: 'GROWTH_DASHBOARD' as const,
    asOfDate: period.asOfDate,
    windowDays: period.windowDays,
    timezone: period.timezone,
    periodStart: period.start,
    periodEnd: period.end,
    schemaVersion: ANALYTICS_SCHEMA_VERSION,
    generatedAt,
    payload: {
      totals: dailyTotals,
      medianTimeToFirstJoinHours: median(firstJoinHours),
      medianTimeToMatchHours: median(matchHours),
      areaDemand: buildAreaDemandPayloads(period, rows, generatedAt),
    },
  };
}
