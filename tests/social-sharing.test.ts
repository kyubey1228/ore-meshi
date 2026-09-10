import test from 'node:test';
import assert from 'node:assert/strict';
import { shareTextForViewer } from '../src/lib/social';

test('他人の募集を共有すると募集者名を先頭に表示する',()=>{
  const text=shareTextForViewer('誰か飯いこ\n新宿で焼肉',false,'田中');
  assert.match(text,/^田中さんが #誰か飯いこ してるよ！/);
});

test('募集者本人の共有文には他人向けの前置きを付けない',()=>{
  assert.equal(shareTextForViewer('誰か飯いこ',true,'田中'),'誰か飯いこ');
});
