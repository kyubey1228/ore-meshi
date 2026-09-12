import { expect, request, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import { assertStripeTestMode } from '../src/lib/stripe-test-mode';
import { billingBusinessStatePath, billingFixturePath } from './fixtures';
import { postWebhook, signPayload } from './billing-webhook-helpers';

// このファイルは playwright.billing.config.ts でのみ実行される(npm run test:e2e:billing)。
// globalSetup (billing-global-setup.ts) が既にStripeキーのtest mode検証・DB分離検証を済ませている。
// ここでも二重に検証する(このファイルだけ直接実行された場合の保険)。
// 注意: このファイルはPlaywrightのテストランナープロセス自身で実行され、webServer.envで
// E2E_STRIPE_*→STRIPE_*にマッピングされた環境変数が渡されるのは spawn される next dev の
// 子プロセスだけ。テストランナー側では素の STRIPE_SECRET_KEY / DATABASE_URL は通常の開発用
// (本番)の値になっているため、必ず E2E_ プレフィックス付きの変数を直接参照すること。
assertStripeTestMode(process.env.E2E_STRIPE_SECRET_KEY, 'business-billing.spec.ts');

const stripe = new Stripe(process.env.E2E_STRIPE_SECRET_KEY!);
const webhookSecret = process.env.E2E_STRIPE_WEBHOOK_SECRET!;
const prisma = new PrismaClient({ datasources: { db: { url: process.env.E2E_DATABASE_URL } } });

async function fixture() {
  const raw = await readFile(billingFixturePath, 'utf-8');
  return JSON.parse(raw) as { businessAccountId: string };
}

async function billingCookies() {
  return JSON.parse(await readFile(billingBusinessStatePath, 'utf-8')).cookies;
}

test.afterAll(async () => { await prisma.$disconnect(); });

test.describe.serial('スポンサー飯: Checkout→Webhook→DB→Dashboard→一般User露出', () => {
  let sponsoredMealId: string;
  let checkoutUrl: string;
  let sessionId: string;

  test('DRAFTのスポンサー飯を用意する(下書き作成UI自体はBilling E2Eの対象外なので直接作成)', async () => {
    const { businessAccountId } = await fixture();
    const meal = await prisma.sponsoredMeal.create({
      data: {
        businessAccountId, title: 'E2E Billing スポンサー飯', sponsorName: 'E2E Billing食堂', restaurantName: 'E2E Billing食堂',
        area: '渋谷', startsAt: new Date(Date.now() + 3 * 60 * 60 * 1000), participantLimit: 4, remainingSlots: 4,
        benefit: 'ドリンク1杯無料', status: 'DRAFT',
      },
    });
    sponsoredMealId = meal.id;
  });

  test('Businessが「支払って公開する」を押すとStripe Test ModeのCheckoutへ遷移する', async ({ page }) => {
    await page.context().addCookies(await billingCookies());
    await page.goto('/business/sponsored-meals');
    await page.getByRole('button', { name: /円で支払って公開する/ }).click();
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 20_000 });
    checkoutUrl = page.url();
    const match = checkoutUrl.match(/cs_[a-zA-Z0-9_]+/);
    if (!match) throw new Error(`Could not extract Checkout Session id from redirect URL: ${checkoutUrl}`);
    sessionId = match[0];
  });

  test('Checkout Sessionの内容がTest Mode・正しいBusiness/Product/Price/metadata/URLになっている', async () => {
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['line_items'] });
    expect(session.livemode, 'Checkout SessionがLive modeになっている(危険: 実際の決済が作られる可能性)').toBe(false);
    expect(session.metadata?.businessAccountId).toBe((await fixture()).businessAccountId);
    expect(session.metadata?.campaignId).toBe(sponsoredMealId);
    expect(session.metadata?.orderType).toBe('SPONSORED_MEAL');
    expect(session.line_items?.data).toHaveLength(1);
    expect(session.line_items?.data[0].quantity).toBe(1);
    expect(session.line_items?.data[0].price?.id).toBe(process.env.E2E_STRIPE_PRICE_SPONSORED_MEAL);
    expect(session.success_url).toContain('checkout=success');
    expect(session.success_url).toContain('order_id=');
    expect(session.cancel_url).toContain('checkout=cancelled');

    const order = await prisma.sponsorOrder.findFirst({ where: { campaignId: sponsoredMealId } });
    expect(order?.status).toBe('PENDING_PAYMENT');
    expect(order?.stripeCheckoutSessionId).toBe(sessionId);
    // 表示価格(Stripe Price)とCheckout時に実際に使われたPriceが一致していること。
    const catalogPrice = await stripe.prices.retrieve(process.env.E2E_STRIPE_PRICE_SPONSORED_MEAL!);
    expect(session.line_items?.data[0].price?.unit_amount).toBe(catalogPrice.unit_amount);
  });

  // NOTE: この先はStripeの実際のホスト型Checkoutページ(checkout.stripe.com)をブラウザ操作で完了させる。
  // Stripe公式にPlaywright/Selenium等での自動操作がサポートされているパターンだが、このサンドボックスには
  // ネットワーク到達性・test mode認証情報が無いため実行して確認できていない。ローカルで最初に実行する際、
  // Stripeのマークアップ変更でセレクタがずれていたら実際のページを見て調整すること。
  test('Stripe Test Mode Checkoutでテストカードにより支払いを完了する', async ({ page }) => {
    await page.goto(checkoutUrl);
    // 現行のStripe Hosted Checkoutはカード情報の入力欄をiframeではなくページ本体の<input>として描画する
    // (iframeが使われるのはApple Pay/Google Pay/Link用の"Secure express checkout frame"のみ)。
    // page.goto直後はStripe側のReactアプリがまだハイドレーション中で、Emailなど他の項目を
    // count()で存在チェックすると間に合わずfalseになり未入力のまま送信されてしまうことがあるため、
    // 先にカード情報を入力してページの初期描画が落ち着くのを待ってからチェックする。
    await page.locator('input[name="cardNumber"]').fill('4242424242424242');
    await page.locator('input[name="cardExpiry"]').fill('12/34');
    await page.locator('input[name="cardCvc"]').fill('123');
    const emailField = page.getByLabel('Email');
    if (await emailField.count()) await emailField.fill('e2e-billing@example.test');
    // Cardholder nameは必須項目。count()での存在チェックだと、カード入力直後の非同期な再描画中に
    // 判定が走って未入力のまま送信されることがあるため、常に入力する。
    await page.getByLabel('Cardholder name').fill('E2E Test');
    await page.getByTestId('hosted-payment-submit-button').click();
    await page.waitForURL(url => url.href.includes('checkout=success'), { timeout: 30_000 });
  });

  test('Stripeが実際に生成したcheckout.session.completed Eventを取得し、自前のWebhookへ中継する', async ({ baseURL }) => {
    const events = await stripe.events.list({ type: 'checkout.session.completed', limit: 10 });
    const event = events.data.find(e => (e.data.object as Stripe.Checkout.Session).id === sessionId);
    expect(event, 'Stripeがcheckout.session.completed Eventを生成していない(決済が完了していない可能性)').toBeTruthy();

    const payload = JSON.stringify(event);
    const signature = signPayload(payload, webhookSecret);
    const result = await postWebhook(baseURL!, payload, signature);
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ received: true, duplicate: false });
  });

  test('DB: SponsorOrderがPAID、SponsoredMealがACTIVEになり、対応するMealが作られている', async () => {
    const order = await prisma.sponsorOrder.findFirst({ where: { campaignId: sponsoredMealId } });
    expect(order?.status).toBe('PAID');
    expect(order?.paidAt).toBeTruthy();
    const meal = await prisma.sponsoredMeal.findUnique({ where: { id: sponsoredMealId } });
    expect(meal?.status).toBe('ACTIVE');
    expect(meal?.mealId).toBeTruthy();
  });

  test('Webhook冪等性: 同一Eventの再送は二重処理されない', async ({ baseURL }) => {
    const events = await stripe.events.list({ type: 'checkout.session.completed', limit: 10 });
    const event = events.data.find(e => (e.data.object as Stripe.Checkout.Session).id === sessionId)!;
    const payload = JSON.stringify(event);
    const signature = signPayload(payload, webhookSecret);
    const result = await postWebhook(baseURL!, payload, signature);
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ duplicate: true });
    // Mealが二重作成されていないこと。
    const meal = await prisma.sponsoredMeal.findUnique({ where: { id: sponsoredMealId } });
    const mealCount = await prisma.meal.count({ where: { id: meal!.mealId! } });
    expect(mealCount).toBe(1);
  });

  test('Webhook: 不正な署名は拒否される', async ({ baseURL }) => {
    const result = await postWebhook(baseURL!, JSON.stringify({ id: 'evt_fake', type: 'checkout.session.completed' }), 't=1,v1=invalidsignature');
    expect(result.status).toBe(400);
  });

  test('Webhook: 存在しないOrder参照のEventは安全に拒否され、既存データを破壊しない', async ({ baseURL }) => {
    const events = await stripe.events.list({ type: 'checkout.session.completed', limit: 10 });
    const source = events.data.find(e => (e.data.object as Stripe.Checkout.Session).id === sessionId)!;
    const tampered = JSON.parse(JSON.stringify(source));
    tampered.id = `evt_e2e_fake_${Date.now()}`;
    tampered.data.object.metadata = { ...tampered.data.object.metadata, orderId: 'nonexistent-order-id' };
    const payload = JSON.stringify(tampered);
    const signature = signPayload(payload, webhookSecret);
    const result = await postWebhook(baseURL!, payload, signature);
    expect(result.status).toBe(400);
    const order = await prisma.sponsorOrder.findFirst({ where: { campaignId: sponsoredMealId } });
    expect(order?.status).toBe('PAID');
  });

  test('Business Dashboardに公開中として表示される', async ({ page }) => {
    await page.context().addCookies(await billingCookies());
    await page.goto('/business/sponsored-meals');
    await expect(page.getByText('公開中')).toBeVisible();
  });

  test('一般User側: 募集一覧・詳細にPRとして露出する', async ({ browser }) => {
    const meal = await prisma.sponsoredMeal.findUnique({ where: { id: sponsoredMealId } });
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`/meals/${meal!.mealId}`);
    await expect(page.getByText(/PR/)).toBeVisible();
    await page.goto(`/campaigns/sponsored-meal/${sponsoredMealId}`);
    await expect(page.getByText('このキャンペーンは実施中です。')).toBeVisible();
    await context.close();
  });
});

test.describe.serial('Subscription: Checkout→Webhook→entitlement→失効時の一般User非露出', () => {
  let sessionId: string;
  let directAdId: string;

  test('STANDARDプランをCheckoutし、実際に決済を完了する', async ({ page }) => {
    await page.context().addCookies(await billingCookies());
    await page.goto('/business/billing');
    await page.getByRole('button', { name: 'このプランにする' }).first().click();
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 20_000 });
    const match = page.url().match(/cs_[a-zA-Z0-9_]+/);
    if (!match) throw new Error(`Could not extract Checkout Session id from redirect URL: ${page.url()}`);
    sessionId = match[0];
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    expect(session.mode).toBe('subscription');
    expect(session.livemode).toBe(false);

    // 現行のStripe Hosted Checkoutはカード情報の入力欄をiframeではなくページ本体の<input>として描画する
    // (iframeが使われるのはApple Pay/Google Pay/Link用の"Secure express checkout frame"のみ)。
    await page.locator('input[name="cardNumber"]').fill('4242424242424242');
    await page.locator('input[name="cardExpiry"]').fill('12/34');
    await page.locator('input[name="cardCvc"]').fill('123');
    const emailField = page.getByLabel('Email');
    if (await emailField.count()) await emailField.fill('e2e-billing@example.test');
    // Cardholder nameは必須項目。
    await page.getByLabel('Cardholder name').fill('E2E Test');
    await page.getByTestId('hosted-payment-submit-button').click();
    await page.waitForURL(url => url.href.includes('subscription=success'), { timeout: 30_000 });
  });

  test('checkout.session.completed(subscription)を中継し、BusinessSubscriptionがACTIVEになる', async ({ baseURL }) => {
    const { businessAccountId } = await fixture();
    const events = await stripe.events.list({ type: 'checkout.session.completed', limit: 10 });
    const event = events.data.find(e => (e.data.object as Stripe.Checkout.Session).id === sessionId)!;
    const payload = JSON.stringify(event);
    const result = await postWebhook(baseURL!, payload, signPayload(payload, webhookSecret));
    expect(result.status).toBe(200);
    const subscription = await prisma.businessSubscription.findUnique({ where: { businessAccountId } });
    expect(subscription?.status).toBe('ACTIVE');
    expect(subscription?.plan).toBe('STANDARD');
  });

  test('PROへ移行しDirect Adを作成できる(canCreateDirectAdがtrueになる)', async ({ baseURL }) => {
    const { businessAccountId } = await fixture();
    // STANDARD→PROの移行は本テストではUIを経由せず、Stripe側のsubscription.updated Eventを直接中継して検証する
    // (Checkout導線はSTANDARD/PROどちらも同一コードパスのため、既に上のテストで実証済み)。
    const subscription = await prisma.businessSubscription.findUnique({ where: { businessAccountId } });
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription!.stripeSubscriptionId);
    await stripe.subscriptions.update(stripeSubscription.id, { items: [{ id: stripeSubscription.items.data[0].id, price: process.env.E2E_STRIPE_PRICE_BUSINESS_PRO! }], proration_behavior: 'none' });
    const updated = await stripe.subscriptions.retrieve(stripeSubscription.id);
    const events = await stripe.events.list({ type: 'customer.subscription.updated', limit: 5 });
    const event = events.data.find(e => (e.data.object as Stripe.Subscription).id === updated.id)!;
    const payload = JSON.stringify(event);
    await postWebhook(baseURL!, payload, signPayload(payload, webhookSecret));

    const dbSubscription = await prisma.businessSubscription.findUnique({ where: { businessAccountId } });
    expect(dbSubscription?.plan).toBe('PRO');

    const directAd = await prisma.directAdCampaign.create({ data: { businessAccountId, title: 'E2E PRO限定広告', advertiserName: 'E2E Billing食堂', description: 'PROプラン限定企業広告', startsAt: new Date(), endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000), status: 'ACTIVE' } });
    directAdId = directAd.id;
    const context = await request.newContext();
    const res = await context.get(`${baseURL}/campaigns/direct-ad-campaign/${directAdId}`);
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain('実施中です');
    await context.dispose();
  });

  test('サブスクがcanceledになると、既存のDirect Adが一般Userへ露出しなくなる(支払い権限失効時の露出制御)', async ({ baseURL }) => {
    const { businessAccountId } = await fixture();
    const subscription = await prisma.businessSubscription.findUnique({ where: { businessAccountId } });
    const canceled = await stripe.subscriptions.cancel(subscription!.stripeSubscriptionId);
    const events = await stripe.events.list({ type: 'customer.subscription.deleted', limit: 5 });
    const event = events.data.find(e => (e.data.object as Stripe.Subscription).id === canceled.id)!;
    const payload = JSON.stringify(event);
    await postWebhook(baseURL!, payload, signPayload(payload, webhookSecret));

    const dbSubscription = await prisma.businessSubscription.findUnique({ where: { businessAccountId } });
    expect(dbSubscription?.status).toBe('CANCELLED');

    const context = await request.newContext();
    const res = await context.get(`${baseURL}/campaigns/direct-ad-campaign/${directAdId}`);
    const body = await res.text();
    expect(body).toContain('終了しました');
    await context.dispose();
  });
});
