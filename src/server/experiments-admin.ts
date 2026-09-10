import 'server-only';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/server/admin';

export type ExperimentVariantResult = { variant: string; exposed: number; converted: number; cvr: number };

// EXPERIMENT_EXPOSED(表示)とEXPERIMENT_CONVERSION(クリック)をsessionKeyで名寄せし、
// 同一セッションの複数回表示/複数回クリックで水増しされないようにする。
async function computeExperimentResults(experimentName: string, days: number): Promise<ExperimentVariantResult[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await prisma.growthEvent.findMany({
    where: {
      eventType: { in: ['EXPERIMENT_EXPOSED', 'EXPERIMENT_CONVERSION'] },
      createdAt: { gte: since },
      metadata: { path: ['experimentName'], equals: experimentName },
    },
    select: { eventType: true, sessionKey: true, metadata: true },
  });

  const byVariant = new Map<string, { exposed: Set<string>; converted: Set<string> }>();
  for (const row of rows) {
    const meta = row.metadata as { variant?: string } | null;
    const variant = meta?.variant;
    if (!variant) continue;
    const bucket = byVariant.get(variant) ?? { exposed: new Set(), converted: new Set() };
    if (row.eventType === 'EXPERIMENT_EXPOSED') bucket.exposed.add(row.sessionKey);
    else bucket.converted.add(row.sessionKey);
    byVariant.set(variant, bucket);
  }

  return [...byVariant.entries()]
    .map(([variant, b]) => ({ variant, exposed: b.exposed.size, converted: b.converted.size, cvr: b.exposed.size ? b.converted.size / b.exposed.size : 0 }))
    .sort((a, b) => a.variant.localeCompare(b.variant));
}

const getCachedExperimentResults = unstable_cache(computeExperimentResults, ['experiment-results'], { revalidate: 300 });
export async function getExperimentResults(experimentName: string, days: number) {
  await requireAdmin();
  return getCachedExperimentResults(experimentName, days);
}
