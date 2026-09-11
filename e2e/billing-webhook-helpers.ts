import Stripe from 'stripe';
import { request as playwrightRequest } from '@playwright/test';

// StripeはE2Eサーバー(127.0.0.1)へ直接Webhookを届けられないため、Test Modeで実際に発生した
// Event(checkout.session.completed等)をStripe APIから取得し、自分でWebhook Secretで署名して
// 自前のWebhookエンドポイントへ中継する。ペイロードは実際にStripeが生成したものそのままであり、
// 署名以外は何も捏造しない。
export function signPayload(payload: string, secret: string, timestamp = Math.floor(Date.now() / 1000)) {
  return Stripe.webhooks.generateTestHeaderString({ payload, secret, timestamp });
}

export async function postWebhook(baseURL: string, payload: string, signature: string) {
  const ctx = await playwrightRequest.newContext();
  const res = await ctx.post(`${baseURL}/api/stripe/webhook`, {
    headers: { 'content-type': 'application/json', 'stripe-signature': signature },
    data: payload,
  });
  const status = res.status();
  const body = await res.json().catch(() => null);
  await ctx.dispose();
  return { status, body };
}
