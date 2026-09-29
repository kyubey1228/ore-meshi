import assert from 'node:assert/strict';
import test from 'node:test';
import { MOBILE_AUTH_RETURN_URI, mobileAuthRequestSchema, pkceChallenge } from '../src/lib/mobile-auth-validation';

test('PKCE S256 challenge matches RFC 7636 example', () => {
  assert.equal(pkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'), 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
});

test('mobile auth permits only the application callback URI', () => {
  const base = { code_challenge: 'a'.repeat(43), state: 'b'.repeat(16) };
  assert.equal(mobileAuthRequestSchema.safeParse({ ...base, return_uri: MOBILE_AUTH_RETURN_URI }).success, true);
  assert.equal(mobileAuthRequestSchema.safeParse({ ...base, return_uri: 'https://evil.example/callback' }).success, false);
});
