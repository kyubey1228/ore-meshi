import { persistDailyMetrics, parseMetricDate, yesterdayInTokyo } from '../src/server/daily-metrics';
import { prisma } from '../src/lib/prisma';

async function main() {
  const args = Object.fromEntries(process.argv.slice(2).map(value => value.split('=')));
  const end = args.to ? parseMetricDate(args.to) : yesterdayInTokyo();
  const start = args.from ? parseMetricDate(args.from) : args.days ? new Date(end.getTime() - (Math.max(1, Number(args.days)) - 1) * 86_400_000) : end;
  if (start > end) throw new Error('--fromは--to以前を指定してください。');
  if ((end.getTime() - start.getTime()) / 86_400_000 > 365) throw new Error('一度にbackfillできる期間は366日までです。');
  for (let current = start; current <= end; current = new Date(current.getTime() + 86_400_000)) {
    console.log(await persistDailyMetrics(current));
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
