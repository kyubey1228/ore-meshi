import assert from 'node:assert/strict';
import test from 'node:test';
import { buildEmailTemplate, emailEventKey, notificationCta } from '../src/lib/email-templates';

test('共通テンプレートはsubject/text/html/CTAと送信専用フッターを生成する', () => {
  const result = buildEmailTemplate({ subject: '飯の予定が決まりました 🍚', body: '募集: 焼肉\n場所: 新宿', ctaLabel: '予定を確認する', ctaUrl: 'https://example.com/matches/1' });
  assert.equal(result.subject, '飯の予定が決まりました 🍚');
  assert.match(result.text, /https:\/\/example\.com\/matches\/1/);
  assert.match(result.text, /返信いただいても確認できません/);
  assert.match(result.html, /<a href="https:\/\/example\.com\/matches\/1"/);
  assert.match(result.html, /<meta name="viewport"/);
});

test('ユーザー入力をHTMLエスケープする', () => {
  const result = buildEmailTemplate({ subject: 'subject', body: '<script>alert(1)</script>', ctaLabel: '開く', ctaUrl: 'https://example.com/?a=1&b=2' });
  assert.doesNotMatch(result.html, /<script>/);
  assert.match(result.html, /&lt;script&gt;/);
  assert.match(result.html, /a=1&amp;b=2/);
});

test('eventKeyはテンプレート・entity・受信者から安定生成する', () => {
  assert.equal(emailEventKey('MEAL_REMINDER_24H', 'match1', 'user1', '24h'), 'meal-reminder-24h:match1:user1:24h');
  assert.equal(notificationCta('JOIN_REQUEST_RECEIVED'), '参加希望を確認する');
  assert.equal(notificationCta('DINING_FEEDBACK_REQUEST'), '感想を送る');
});
