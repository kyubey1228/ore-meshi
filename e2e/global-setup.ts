import { mkdir, writeFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import { encode } from 'next-auth/jwt';
import { E2E_PREFIX, statePath, users } from './fixtures';

export default async function globalSetup() {
  const databaseUrl = process.env.E2E_DATABASE_URL;
  if (!databaseUrl) throw new Error('E2E_DATABASE_URL is required. Use a disposable test database; production DATABASE_URL is never accepted.');
  if (databaseUrl === process.env.DATABASE_URL && process.env.E2E_ALLOW_SHARED_DB !== 'true') throw new Error('E2E_DATABASE_URL must differ from DATABASE_URL. Set E2E_ALLOW_SHARED_DB=true only for an explicitly disposable database.');
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const secret = process.env.AUTH_SECRET ?? 'ore-meshi-e2e-secret-at-least-32-characters';
  await mkdir('e2e/.auth', { recursive: true });
  try {
    const rows = {} as Record<keyof typeof users, { id: string; displayName: string }>;
    for (const [key, fixture] of Object.entries(users) as [keyof typeof users, typeof users[keyof typeof users]][]) {
      rows[key] = await prisma.user.upsert({
        where: { twitterId: fixture.twitterId },
        create: { twitterId: fixture.twitterId, twitterUsername: fixture.username, displayName: fixture.name, bio: `${E2E_PREFIX} fixture`, onboardingCompletedAt: new Date() },
        update: { twitterUsername: fixture.username, displayName: fixture.name, onboardingCompletedAt: new Date() },
        select: { id: true, displayName: true },
      });
    }
    const business = await prisma.businessAccount.upsert({ where: { slug: `${E2E_PREFIX}-business` }, create: { name: 'E2E テスト食堂', slug: `${E2E_PREFIX}-business`, area: '渋谷', status: 'ACTIVE', businessType: 'RESTAURANT', contactName: 'E2E 店長', contactEmail: 'e2e-business@example.test', purposes: ['空席対策'] }, update: { status: 'ACTIVE' } });
    await prisma.businessMember.upsert({ where: { businessAccountId_userId: { businessAccountId: business.id, userId: rows.business.id } }, create: { businessAccountId: business.id, userId: rows.business.id, role: 'OWNER', canPostToSocial: true }, update: { role: 'OWNER', canPostToSocial: true } });
    for (const [key, user] of Object.entries(rows) as [keyof typeof users, { id: string; displayName: string }][]) {
      const token = await encode({ token: { userId: user.id, sub: user.id, name: user.displayName }, secret, maxAge: 86400 });
      await writeFile(statePath(key), JSON.stringify({ cookies: [{ name: 'next-auth.session-token', value: token, domain: '127.0.0.1', path: '/', expires: Math.floor(Date.now() / 1000) + 86400, httpOnly: true, secure: false, sameSite: 'Lax' }], origins: [] }));
    }
  } finally { await prisma.$disconnect(); }
}
