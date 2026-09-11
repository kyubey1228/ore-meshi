import { execSync } from 'node:child_process';

// E2E_DATABASE_URLに対してprisma migrate deployを実行するだけの薄いラッパー。
// db:deployは本番のDATABASE_URLを使うため、E2E用のテストDBには別途これを使う必要がある。
const url = process.env.E2E_DATABASE_URL;
if (!url) throw new Error('E2E_DATABASE_URL is required. Set it in .env.local or export it in your shell.');
if (url === process.env.DATABASE_URL && process.env.E2E_ALLOW_SHARED_DB !== 'true') {
  throw new Error('E2E_DATABASE_URL must differ from DATABASE_URL. Set E2E_ALLOW_SHARED_DB=true only for an explicitly disposable database.');
}

// prisma migrate deployはadvisory lock等セッション単位の機能を使うため、Transaction mode pooler
// (Supabaseの場合ポート6543)には向かない(ハングまたは失敗する)。schema.prisma同様にdirectUrlが
// 別途必要で、E2E_DIRECT_URLが無い場合はSupabaseのSession mode pooler(同じホストのポート5432)を
// 自動的に組み立てる。それでも届かない場合はE2E_DIRECT_URLで直接指定すること。
function deriveDirectUrl(databaseUrl) {
  if (process.env.E2E_DIRECT_URL) return process.env.E2E_DIRECT_URL;
  try {
    const parsed = new URL(databaseUrl);
    if (parsed.hostname.endsWith('.pooler.supabase.com') && parsed.port === '6543') {
      parsed.port = '5432';
      parsed.searchParams.delete('pgbouncer');
      return parsed.toString();
    }
  } catch {
    // fall through
  }
  return databaseUrl;
}

const directUrl = deriveDirectUrl(url);

execSync('node node_modules/prisma/build/index.js migrate deploy', {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: url, DIRECT_URL: directUrl },
});
