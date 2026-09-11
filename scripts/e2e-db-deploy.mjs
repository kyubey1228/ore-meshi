import { execSync } from 'node:child_process';

// E2E_DATABASE_URLに対してprisma migrate deployを実行するだけの薄いラッパー。
// db:deployは本番のDATABASE_URLを使うため、E2E用のテストDBには別途これを使う必要がある。
const url = process.env.E2E_DATABASE_URL;
if (!url) throw new Error('E2E_DATABASE_URL is required. Set it in .env.local or export it in your shell.');
if (url === process.env.DATABASE_URL && process.env.E2E_ALLOW_SHARED_DB !== 'true') {
  throw new Error('E2E_DATABASE_URL must differ from DATABASE_URL. Set E2E_ALLOW_SHARED_DB=true only for an explicitly disposable database.');
}

execSync('node node_modules/prisma/build/index.js migrate deploy', {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
});
