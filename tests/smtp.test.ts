import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveSmtpSecure } from '../src/lib/smtp';

test('SMTP_SECURE未指定ならポート465だけTLSを有効にする', () => {
  assert.equal(resolveSmtpSecure(465, undefined), true);
  assert.equal(resolveSmtpSecure(587, undefined), false);
});

test('SMTP_SECUREが明示されていればポートに関わらずそれを優先する', () => {
  assert.equal(resolveSmtpSecure(465, 'false'), false);
  assert.equal(resolveSmtpSecure(587, 'true'), true);
});
