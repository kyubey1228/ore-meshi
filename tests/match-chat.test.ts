import assert from 'node:assert/strict';
import test from 'node:test';
import { chatInputSchema, chatState } from '../src/lib/match-chat';

test('chat opens only on a matched active meal and closes after completion/cancellation', () => {
  assert.equal(chatState('ACTIVE', 'OPEN'), 'WAITING');
  assert.equal(chatState('ACTIVE', 'MATCHED'), 'OPEN');
  for (const status of ['COMPLETED', 'CANCELLED']) assert.equal(chatState(status, 'MATCHED'), 'CLOSED');
  for (const status of ['CLOSED', 'CANCELLED']) assert.equal(chatState('ACTIVE', status), 'CLOSED');
});
test('chat validates bounded non-empty messages and retry IDs', () => {
  const clientMessageId = '123e4567-e89b-42d3-a456-426614174000';
  assert.equal(chatInputSchema.parse({ body: '  駅前で集合  ', clientMessageId }).body, '駅前で集合');
  for (const body of ['', ' \n ', 'あ'.repeat(1001)]) assert.equal(chatInputSchema.safeParse({ body, clientMessageId }).success, false);
  assert.equal(chatInputSchema.safeParse({ body: '駅前', clientMessageId: 'invalid' }).success, false);
});
