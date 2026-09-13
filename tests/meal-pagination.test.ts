import assert from 'node:assert/strict';
import test from 'node:test';
import { mealPageNumber, mealPageHref, sliceMealPage, MEAL_PAGE_SIZE } from '../src/lib/meal-pagination';

test('pagination accepts bounded positive integers only', () => {
  for (const value of [undefined, '', '0', '-1', '1.5', 'Infinity', ['2'], '1e3', '999999999']) assert.equal(mealPageNumber(value), 1);
  assert.equal(mealPageNumber('2'), 2);
  assert.equal(mealPageNumber('99999'), 10_000);
});
test('page links preserve filters but not unknown parameters', () => {
  const href = mealPageHref({ area: '渋谷 & 新宿', when: 'soon', remaining: '1', page: '2', garbage: 'x' }, 3);
  const url = new URL(href, 'http://localhost');
  assert.equal(url.searchParams.get('area'), '渋谷 & 新宿');
  assert.equal(url.searchParams.get('when'), 'soon');
  assert.equal(url.searchParams.get('remaining'), '1');
  assert.equal(url.searchParams.get('page'), '3');
  assert.equal(url.searchParams.has('garbage'), false);
  assert.equal(mealPageHref({}, 1), '/meals');
  assert.equal(mealPageHref({ area: '渋谷', page: '2' }, 1), '/meals?area=%E6%B8%8B%E8%B0%B7');
});
test('lookahead is not rendered; final and empty pages have no next link', () => {
  const rows = Array.from({ length: MEAL_PAGE_SIZE + 1 }, (_, id) => ({ id }));
  assert.deepEqual(sliceMealPage(rows), { meals: rows.slice(0, 12), hasNext: true });
  assert.deepEqual(sliceMealPage(rows.slice(0, 12)), { meals: rows.slice(0, 12), hasNext: false });
  assert.deepEqual(sliceMealPage([]), { meals: [], hasNext: false });
});
