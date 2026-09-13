import assert from 'node:assert/strict';
import test from 'node:test';
import { buildGrowthEventRecord, buildGrowthEventRecords } from '../src/lib/growth-event-records';

test('server growth batch preserves event order, session, attribution and notification channels', () => {
  const data = { recruitmentId: 'meal-1', loggedIn: true, notificationType: 'JOIN_REQUEST_RECEIVED', source: 'invite', utmMedium: 'social', utmCampaign: 'dinner' };
  const records = buildGrowthEventRecords('session-1', [
    { eventType: 'NOTIFICATION_CREATED', data },
    { eventType: 'NOTIFICATION_SENT', data: { ...data, channel: 'IN_APP' } },
  ]);
  assert.deepEqual(records, [
    buildGrowthEventRecord('session-1', 'NOTIFICATION_CREATED', data),
    buildGrowthEventRecord('session-1', 'NOTIFICATION_SENT', { ...data, channel: 'IN_APP' }),
  ]);
  assert.deepEqual(records.map(record => record.eventType), ['NOTIFICATION_CREATED', 'NOTIFICATION_SENT']);
  assert.equal(records[0].sessionKey, 'session-1');
  assert.equal(records[0].recruitmentId, 'meal-1');
  assert.equal(records[0].source, 'invite');
  assert.equal(records[0].utmMedium, 'social');
  assert.equal(records[0].utmCampaign, 'dinner');
  assert.deepEqual(records[1].metadata, { notificationType: 'JOIN_REQUEST_RECEIVED', channel: 'IN_APP' });
});

test('server growth metadata is merged without mutating caller input', () => {
  const metadata = Object.freeze({ custom: 'preserved', notificationType: 'old', channel: 'old' });
  const record = buildGrowthEventRecord('session-2', 'EMAIL_SENT', { metadata, notificationType: 'MEAL_MATCHED', channel: 'EMAIL' });
  assert.deepEqual(record.metadata, { custom: 'preserved', notificationType: 'MEAL_MATCHED', channel: 'EMAIL' });
  assert.deepEqual(metadata, { custom: 'preserved', notificationType: 'old', channel: 'old' });
  assert.equal('notificationType' in record, false);
  assert.equal('channel' in record, false);
});

test('server growth batches accept empty events and optional metadata without losing JSON values', () => {
  assert.deepEqual(buildGrowthEventRecords('session', []), []);
  assert.deepEqual(buildGrowthEventRecords('server', [{ eventType: 'NOTIFICATION_CREATED' }]), [
    { sessionKey: 'server', eventType: 'NOTIFICATION_CREATED', metadata: undefined },
  ]);
  for (const metadata of ['value', 0, false, ['value'], { nested: { field: 'value' } }]) {
    assert.deepEqual(buildGrowthEventRecord('session', 'EMAIL_SENT', { metadata }).metadata, metadata);
  }
});
