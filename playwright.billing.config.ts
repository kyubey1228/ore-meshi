import { defineConfig, devices } from '@playwright/test';

// Business Billingの完全E2E専用の設定。通常の playwright.config.ts (test:e2e) とは
// 別プロセス・別ポート・別Stripe設定で動かし、本番Stripeキーが誤って使われる経路を作らない。
const port = Number(process.env.E2E_BILLING_PORT ?? 3101);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './e2e',
  testMatch: /business-billing\.spec\.ts$/,
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  globalSetup: './e2e/billing-global-setup.ts',
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
      // このモードでのみ src/lib/stripe.ts が test mode キーであることを起動時に再検証する。
      E2E_BILLING_MODE: 'true',
      STRIPE_SECRET_KEY: process.env.E2E_STRIPE_SECRET_KEY ?? '',
      STRIPE_WEBHOOK_SECRET: process.env.E2E_STRIPE_WEBHOOK_SECRET ?? '',
      STRIPE_PRICE_SPONSORED_MEAL: process.env.E2E_STRIPE_PRICE_SPONSORED_MEAL ?? '',
      STRIPE_PRICE_SEAT_CAMPAIGN: process.env.E2E_STRIPE_PRICE_SEAT_CAMPAIGN ?? '',
      STRIPE_PRICE_AREA_FEATURED: process.env.E2E_STRIPE_PRICE_AREA_FEATURED ?? '',
      STRIPE_PRICE_DIRECT_AD: process.env.E2E_STRIPE_PRICE_DIRECT_AD ?? '',
      STRIPE_PRICE_BUSINESS_STANDARD: process.env.E2E_STRIPE_PRICE_BUSINESS_STANDARD ?? '',
      STRIPE_PRICE_BUSINESS_PRO: process.env.E2E_STRIPE_PRICE_BUSINESS_PRO ?? '',
      STRIPE_COUPON_STANDARD: process.env.E2E_STRIPE_COUPON_STANDARD ?? '',
      STRIPE_COUPON_PRO: process.env.E2E_STRIPE_COUPON_PRO ?? '',
    },
  },
});
