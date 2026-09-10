import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- businessLead.findMany (include businessAccount) ---');
  try {
    const leads = await prisma.businessLead.findMany({ include: { businessAccount: true }, orderBy: { createdAt: 'desc' }, take: 200 });
    console.log(`OK: fetched ${leads.length} leads`);
    for (const l of leads) {
      console.log(`- id=${l.id} status=${l.status} source=${l.source} businessType=${l.businessType} businessAccount.status=${l.businessAccount?.status ?? 'null'} businessAccount.businessType=${l.businessAccount?.businessType ?? 'null'}`);
    }
  } catch (e) {
    console.error('businessLead.findMany FAILED:', e);
  }

  console.log('\n--- businessMarketingEvent.groupBy(eventType) ---');
  try {
    const events = await prisma.businessMarketingEvent.groupBy({ by: ['eventType'], _count: { _all: true } });
    console.log(`OK: fetched ${events.length} event type groups`);
    for (const e of events) console.log(`- ${e.eventType}: ${e._count._all}`);
  } catch (e) {
    console.error('businessMarketingEvent.groupBy FAILED:', e);
  }

  console.log('\n--- businessLead.count ---');
  try {
    const total = await prisma.businessLead.count();
    const won = await prisma.businessLead.count({ where: { status: 'WON' } });
    console.log(`OK: total=${total} won=${won}`);
  } catch (e) {
    console.error('businessLead.count FAILED:', e);
  }
}

main().catch(e => { console.error('main FAILED:', e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
