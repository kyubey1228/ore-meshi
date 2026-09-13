export const MEAL_PAGE_SIZE = 12;
export const MAX_MEAL_PAGE = 10_000;

export function mealPageNumber(value: unknown) {
  if (typeof value !== 'string' || !/^[1-9]\d{0,4}$/.test(value)) return 1;
  return Math.min(Number(value), MAX_MEAL_PAGE);
}

export function mealPageHref(raw: Record<string, string | string[] | undefined>, page: number) {
  const params = new URLSearchParams();
  for (const key of ['area', 'date', 'budget', 'paymentType', 'purpose', 'when', 'remaining']) {
    const value = raw[key];
    if (typeof value === 'string' && value) params.set(key, value);
  }
  if (page > 1) params.set('page', String(Math.min(page, MAX_MEAL_PAGE)));
  return `/meals${params.size ? `?${params}` : ''}`;
}

export function sliceMealPage<T>(rows: T[]) {
  return { meals: rows.slice(0, MEAL_PAGE_SIZE), hasNext: rows.length > MEAL_PAGE_SIZE };
}
