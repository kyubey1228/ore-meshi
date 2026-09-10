import 'server-only';
import { prisma } from '@/lib/prisma';
import { requirePageUser } from '@/server/auth';

export async function getDemandClusters(area?: string) {
  const rows = await prisma.demandIntent.groupBy({
    by: ['area', 'genre', 'timeRange'],
    where: { status: 'ACTIVE', expiresAt: { gt: new Date() }, ...(area ? { area: { contains: area, mode: 'insensitive' } } : {}) },
    _count: { _all: true },
  });
  return rows
    .filter(r => r._count._all >= 2)
    .sort((a, b) => b._count._all - a._count._all)
    .slice(0, 20)
    .map(r => ({ area: r.area, genre: r.genre, timeRange: r.timeRange, count: r._count._all }));
}

export async function getMyDemandIntents() {
  const userId = await requirePageUser();
  return prisma.demandIntent.findMany({ where: { userId, status: 'ACTIVE', expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } });
}

export async function getDemandSummary() {
  const [total, matched] = await Promise.all([
    prisma.demandIntent.count(),
    prisma.demandIntent.count({ where: { status: 'MATCHED' } }),
  ]);
  return { total, matched, matchRate: total ? matched / total : 0 };
}
