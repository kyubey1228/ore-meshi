import { createHash } from 'node:crypto';
import { z } from 'zod';

export const MOBILE_AUTH_RETURN_URI = 'ore-meshi://auth/callback';

export const mobileAuthRequestSchema = z.object({
  code_challenge: z.string().regex(/^[A-Za-z0-9_-]{43,128}$/),
  state: z.string().regex(/^[A-Za-z0-9_-]{16,128}$/),
  return_uri: z.literal(MOBILE_AUTH_RETURN_URI),
});

export const mobileAuthExchangeSchema = z.object({
  code: z.string().regex(/^[A-Za-z0-9_-]{32,256}$/),
  codeVerifier: z.string().regex(/^[A-Za-z0-9_-]{43,128}$/),
});

export function pkceChallenge(verifier: string) {
  return createHash('sha256').update(verifier).digest('base64url');
}
