import 'server-only';
import { PrismaClient } from '@prisma/client';

function databaseUrl() {
  const value = process.env.DATABASE_URL;
  if (!value) return undefined;

  try {
    const url = new URL(value);
    url.searchParams.set('sslmode', 'require');
    url.searchParams.set('connect_timeout', '15');
    if (url.port === '6543' && url.hostname.endsWith('.pooler.supabase.com')) {
      url.searchParams.set('pgbouncer', 'true');
      url.searchParams.set('connection_limit', '1');
      url.searchParams.set('pool_timeout', '15');
    }
    return url.toString();
  } catch {
    return value;
  }
}

function createPrismaClient() {
  const client = new PrismaClient({
    datasources: { db: { url: databaseUrl() } },
    log: [{ emit: 'event', level: 'query' }],
  });
  client.$on('query', event => {
    const message = `[PERF] DB ${event.target} ${event.duration}ms`;
    if (event.duration >= 100) console.warn(message);
    else if (process.env.PERF_LOG_ALL === 'true') console.info(message);
  });
  return client;
}

const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createPrismaClient> };
export const prisma = globalForPrisma.prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
