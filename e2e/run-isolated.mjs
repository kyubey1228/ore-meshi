import { spawnSync } from 'node:child_process';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required in .env.local');
const pooledUrl = new URL(process.env.DATABASE_URL);
const directUrl = new URL(process.env.DIRECT_URL || process.env.DATABASE_URL);
pooledUrl.searchParams.set('schema', 'e2e_ore_meshi');
directUrl.searchParams.set('schema', 'e2e_ore_meshi');
const env = { ...process.env, DATABASE_URL: pooledUrl.toString(), DIRECT_URL: directUrl.toString(), E2E_DATABASE_URL: pooledUrl.toString(), E2E_ALLOW_SHARED_DB: 'true' };
const selectedTests = process.argv.slice(2);
for (const [command, args] of [['npx', ['prisma', 'migrate', 'deploy']], ['npx', ['playwright', 'test', ...selectedTests]]]) {
  const result = spawnSync(command, args, { env, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
