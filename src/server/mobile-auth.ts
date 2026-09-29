import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { pkceChallenge } from '@/lib/mobile-auth-validation';

export { mobileAuthExchangeSchema, mobileAuthRequestSchema } from '@/lib/mobile-auth-validation';

const AUTH_CODE_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function hash(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function base64Url(bytes: Buffer) {
  return bytes.toString('base64url');
}

export async function createMobileAuthorizationCode(userId: string, codeChallenge: string) {
  const code = base64Url(randomBytes(32));
  await prisma.mobileAuthorizationCode.create({ data: {
    userId,
    codeHash: hash(code),
    codeChallenge,
    expiresAt: new Date(Date.now() + AUTH_CODE_TTL_MS),
  } });
  return code;
}

export async function exchangeMobileAuthorizationCode(code: string, codeVerifier: string) {
  const codeHash = hash(code);
  const record = await prisma.mobileAuthorizationCode.findUnique({ where: { codeHash } });
  if (!record || record.usedAt || record.expiresAt <= new Date()) return null;
  if (record.codeChallenge !== pkceChallenge(codeVerifier)) return null;

  const token = base64Url(randomBytes(32));
  const tokenHash = hash(token);
  const session = await prisma.$transaction(async tx => {
    const consumed = await tx.mobileAuthorizationCode.updateMany({ where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
    if (consumed.count !== 1) return null;
    return tx.mobileSession.create({ data: { userId: record.userId, tokenHash, expiresAt: new Date(Date.now() + SESSION_TTL_MS) } });
  });
  return session ? { token, expiresAt: session.expiresAt } : null;
}

function bearerToken(request: Request) {
  const value = request.headers.get('authorization');
  if (!value?.startsWith('Bearer ')) return null;
  const token = value.slice(7).trim();
  return /^[A-Za-z0-9_-]{32,256}$/.test(token) ? token : null;
}

const mobileUserSelect = { id: true, displayName: true, twitterUsername: true, image: true, bio: true, onboardingCompletedAt: true } as const;

export async function getMobileSession(request: Request) {
  const token = bearerToken(request);
  if (!token) return null;
  const session = await prisma.mobileSession.findUnique({ where: { tokenHash: hash(token) }, include: { user: { select: mobileUserSelect } } });
  if (!session || session.revokedAt || session.expiresAt <= new Date()) return null;
  return { session, user: session.user };
}

export async function revokeMobileSession(request: Request) {
  const token = bearerToken(request);
  if (!token) return false;
  const result = await prisma.mobileSession.updateMany({ where: { tokenHash: hash(token), revokedAt: null }, data: { revokedAt: new Date() } });
  return result.count === 1;
}
