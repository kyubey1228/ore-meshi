import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './e2e',
  // business-billing.spec.tsはplaywright.billing.config.ts(npm run test:e2e:billing)専用。
  // このモジュールはimport時点でSTRIPE_SECRET_KEYのtest mode検証を行うため、通常のE2E実行
  // (本番Stripeキーがそのまま.env.localから見える環境)に含めると意図的に例外で落ちる。
  testIgnore: /business-billing\.spec\.ts$/,
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  retries: 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  globalSetup: './e2e/global-setup.ts',
  webServer: {
    command: `npm run dev -- --port ${port}`,
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      DATABASE_URL: process.env.E2E_DATABASE_URL ?? '',
      DIRECT_URL: process.env.E2E_DATABASE_URL ?? '',
      AUTH_SECRET: process.env.AUTH_SECRET ?? 'ore-meshi-e2e-secret-at-least-32-characters',
      AUTH_TWITTER_ID: 'e2e-twitter-id',
      AUTH_TWITTER_SECRET: 'e2e-twitter-secret',
      NEXTAUTH_URL: baseURL,
      NEXT_PUBLIC_APP_URL: baseURL,
      BUSINESS_AUTO_APPROVE: 'true',
    },
  },
});
