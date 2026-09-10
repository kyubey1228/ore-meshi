import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- businessAccount.findMany (ACTIVE) ---');
  try {
    const rows = await prisma.businessAccount.findMany({ where: { status: 'ACTIVE' }, select: { id: true, name: true, area: true }, orderBy: { name: 'asc' }, take: 500 });
    console.log(`OK: ${rows.length} rows`);
  } catch (e) {
    console.error('businessAccount.findMany FAILED:', e);
  }

  console.log('\n--- sponsoredMeal.findMany ---');
  try {
    const rows = await prisma.sponsoredMeal.findMany({ orderBy: { createdAt: 'desc' }, take: 30, select: { id: true, title: true, area: true, status: true, createdAt: true, businessAccount: { select: { name: true } } } });
    console.log(`OK: ${rows.length} rows`);
  } catch (e) {
    console.error('sponsoredMeal.findMany FAILED:', e);
  }

  console.log('\n--- sponsorCampaign.findMany ---');
  try {
    const rows = await prisma.sponsorCampaign.findMany({ orderBy: { createdAt: 'desc' }, take: 30, select: { id: true, title: true, area: true, status: true, createdAt: true, businessAccount: { select: { name: true } } } });
    console.log(`OK: ${rows.length} rows`);
  } catch (e) {
    console.error('sponsorCampaign.findMany FAILED:', e);
  }

  console.log('\n--- seatCampaign.findMany ---');
  try {
    const rows = await prisma.seatCampaign.findMany({ orderBy: { createdAt: 'desc' }, take: 30, select: { id: true, restaurantName: true, area: true, status: true, createdAt: true, businessAccount: { select: { name: true } } } });
    console.log(`OK: ${rows.length} rows`);
  } catch (e) {
    console.error('seatCampaign.findMany FAILED:', e);
  }

  console.log('\n--- coupon.findMany ---');
  try {
    const rows = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' }, take: 30, select: { id: true, title: true, area: true, status: true, createdAt: true, businessAccount: { select: { name: true } } } });
    console.log(`OK: ${rows.length} rows`);
  } catch (e) {
    console.error('coupon.findMany FAILED:', e);
  }

  console.log('\n--- partnerCampaign.findMany ---');
  try {
    const rows = await prisma.partnerCampaign.findMany({ orderBy: { createdAt: 'desc' }, take: 100, select: { id: true, slug: true, title: true, description: true, area: true, offerText: true, startsAt: true, endsAt: true, maxPartners: true, joinedPartners: true, status: true, createdAt: true, _count: { select: { members: true, leads: true } } } });
    console.log(`OK: ${rows.length} rows`);
    for (const r of rows) console.log(`- ${r.slug} status=${r.status} startsAt=${r.startsAt.toISOString()} endsAt=${r.endsAt.toISOString()}`);
  } catch (e) {
    console.error('partnerCampaign.findMany FAILED:', e);
  }
}

main().catch(e => { console.error('main FAILED:', e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
