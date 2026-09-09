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

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: { db: { url: databaseUrl() } },
});
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
