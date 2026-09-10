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
      // connection_limit=1だと、永続プロセスとして動くこのアプリ全体でDB接続が実質1本に固定され、
      // ページ内のPromise.allによる並列queryもプロセス間の同時リクエストも、すべて接続待ちで直列化されてしまう
      // (連続する複数ページで一様に遅かった実際の原因)。connection_limit=1は「1リクエスト=1Lambda起動」のような
      // 真のサーバーレス環境向けの値であり、シングルトンのPrismaClientを使うこのアプリには合わない。
      // Transaction mode pooler(PgBouncer)は多数のクライアント接続を少数の実バックエンド接続に多重化する設計のため、
      // 適度な並列度を確保できるよう引き上げる。
      url.searchParams.set('connection_limit', '10');
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
