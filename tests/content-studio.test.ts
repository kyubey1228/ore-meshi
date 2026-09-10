import test from 'node:test';
import assert from 'node:assert/strict';
import { generateContentIdeas } from '../src/lib/content-ideas';

test('generateContentIdeasはデータが無い項目のテンプレートを生成しない', () => {
  const ideas = generateContentIdeas({ weeklyCompleted: 0, weeklyUniqueDiners: 0, topArea: null, openMealsTopArea: null, highDemandCell: null });
  assert.equal(ideas.length, 0);
});

test('generateContentIdeasは週間成立実績があるとX/Instagram向けの下書きを作る', () => {
  const ideas = generateContentIdeas({ weeklyCompleted: 12, weeklyUniqueDiners: 20, topArea: '渋谷区', openMealsTopArea: null, highDemandCell: null });
  assert.equal(ideas.length, 2);
  assert.equal(ideas[0].channel, 'X');
  assert.match(ideas[0].body, /12件/);
  assert.equal(ideas[1].channel, 'INSTAGRAM');
  assert.match(ideas[1].body, /渋谷区/);
});

test('generateContentIdeasは需要過多エリアがあるとX/Threads向けの下書きを作る', () => {
  const ideas = generateContentIdeas({ weeklyCompleted: 0, weeklyUniqueDiners: 0, topArea: null, openMealsTopArea: null, highDemandCell: { area: '船橋駅', genre: 'ラーメン', demandIntents: 15, activeMeals: 3 } });
  assert.equal(ideas.length, 2);
  assert.match(ideas[0].body, /船橋駅/);
  assert.match(ideas[0].body, /12件/);
  assert.equal(ideas[1].channel, 'THREADS');
});

test('generateContentIdeasは最大6件までに抑える', () => {
  const ideas = generateContentIdeas({
    weeklyCompleted: 12, weeklyUniqueDiners: 20, topArea: '渋谷区',
    openMealsTopArea: { area: '新宿区', count: 5 },
    highDemandCell: { area: '船橋駅', genre: 'ラーメン', demandIntents: 15, activeMeals: 3 },
  });
  assert.ok(ideas.length <= 6);
});
