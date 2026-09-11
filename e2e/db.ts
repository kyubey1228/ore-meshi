import { PrismaClient } from '@prisma/client';

// Transaction mode pooler(Supabaseの場合ポート6543)はサーバーサイドのprepared statementを
// 使うクライアントと相性が悪く、テスト内で複数コンテキストから並行にクエリを投げると
// 「prepared statement "sN" does not exist」で落ちることがある(src/lib/prisma.tsの
// databaseUrl()が本番コードで同じ理由でpgbouncer=trueを付けているのと同じ対策)。
function normalizedUrl() {
  const value = process.env.E2E_DATABASE_URL;
  if (!value) return value;
  try {
    const url = new URL(value);
    if (url.hostname.endsWith('.pooler.supabase.com') && url.port === '6543') {
      url.searchParams.set('pgbouncer', 'true');
    }
    return url.toString();
  } catch {
    return value;
  }
}

// global-setup.ts と同じ検証済みE2E_DATABASE_URLを使う共有クライアント。
// 個別のspecファイルがテスト用の状態(過去日時への書き換え・締切切れ等)を直接作るために使う。
export const db = new PrismaClient({ datasources: { db: { url: normalizedUrl() } } });
