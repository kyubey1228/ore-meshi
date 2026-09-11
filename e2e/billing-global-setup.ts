import { mkdir, writeFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import { encode } from 'next-auth/jwt';
import { assertStripeTestMode } from '../src/lib/stripe-test-mode';
import { billingBusinessSlug, billingBusinessStatePath, billingFixturePath, users } from './fixtures';

const REQUIRED_PRICE_ENV_VARS = [
  'E2E_STRIPE_PRICE_SPONSORED_MEAL',
  'E2E_STRIPE_PRICE_SEAT_CAMPAIGN',
  'E2E_STRIPE_PRICE_BUSINESS_STANDARD',
  'E2E_STRIPE_PRICE_BUSINESS_PRO',
];

export default async function billingGlobalSetup() {
  // 最重要: これより先に一切の副作用(DB書き込み含む)を起こさない。
  // Stripeキーがtest modeであることを確認できない限りFAIL FASTする(skipしてCIをGreenにしない)。
  assertStripeTestMode(process.env.E2E_STRIPE_SECRET_KEY, 'Billing E2E global setup');
  if (!process.env.E2E_STRIPE_WEBHOOK_SECRET) throw new Error('E2E_STRIPE_WEBHOOK_SECRET is required for Billing E2E. See .env.example.');
  for (const name of REQUIRED_PRICE_ENV_VARS) {
    if (!process.env[name]?.trim()) throw new Error(`${name} is required for Billing E2E (a Stripe TEST MODE price id, price_...). See .env.example.`);
  }

  const databaseUrl = process.env.E2E_DATABASE_URL;
  if (!databaseUrl) throw new Error('E2E_DATABASE_URL is required. Use a disposable test database; production DATABASE_URL is never accepted.');
  if (databaseUrl === process.env.DATABASE_URL && process.env.E2E_ALLOW_SHARED_DB !== 'true') {
    throw new Error('E2E_DATABASE_URL must differ from DATABASE_URL. Set E2E_ALLOW_SHARED_DB=true only for an explicitly disposable database.');
  }

  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const secret = process.env.AUTH_SECRET ?? 'ore-meshi-e2e-secret-at-least-32-characters';
  await mkdir('e2e/.auth', { recursive: true });
  try {
    const businessUser = await prisma.user.upsert({
      where: { twitterId: `${users.business.twitterId}-billing` },
      create: { twitterId: `${users.business.twitterId}-billing`, twitterUsername: 'e2e_billing_owner', displayName: 'E2E Billing店長', onboardingCompletedAt: new Date() },
      update: { twitterUsername: 'e2e_billing_owner', displayName: 'E2E Billing店長' },
      select: { id: true, displayName: true },
    });
    const business = await prisma.businessAccount.upsert({
      where: { slug: billingBusinessSlug },
      create: { name: 'E2E Billing食堂', slug: billingBusinessSlug, area: '渋谷', status: 'ACTIVE', businessType: 'RESTAURANT', contactName: 'E2E Billing店長', contactEmail: 'e2e-billing@example.test', purposes: ['空席対策'] },
      update: { status: 'ACTIVE', planOverride: null },
    });
    await prisma.businessMember.upsert({
      where: { businessAccountId_userId: { businessAccountId: business.id, userId: businessUser.id } },
      create: { businessAccountId: business.id, userId: businessUser.id, role: 'OWNER', canPostToSocial: true },
      update: { role: 'OWNER', canPostToSocial: true },
    });

    // 使い捨てDB前提だが、ローカルで何度も実行しても前回分の請求データが残らないようにする。
    await prisma.sponsorOrder.deleteMany({ where: { businessAccountId: business.id } });
    await prisma.sponsoredMeal.deleteMany({ where: { businessAccountId: business.id } });
    await prisma.seatCampaign.deleteMany({ where: { businessAccountId: business.id } });
    await prisma.directAdCampaign.deleteMany({ where: { businessAccountId: business.id } });
    await prisma.businessSubscription.deleteMany({ where: { businessAccountId: business.id } });
    await prisma.billingCustomer.deleteMany({ where: { businessAccountId: business.id } });

    const token = await encode({ token: { userId: businessUser.id, sub: businessUser.id, name: businessUser.displayName }, secret, maxAge: 86400 });
    await writeFile(billingBusinessStatePath, JSON.stringify({ cookies: [{ name: 'next-auth.session-token', value: token, domain: '127.0.0.1', path: '/', expires: Math.floor(Date.now() / 1000) + 86400, httpOnly: true, secure: false, sameSite: 'Lax' }], origins: [] }));
    await writeFile(billingFixturePath, JSON.stringify({ businessAccountId: business.id }));
  } finally {
    await prisma.$disconnect();
  }
}
