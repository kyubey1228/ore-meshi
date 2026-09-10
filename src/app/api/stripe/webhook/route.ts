import { getStripe } from '@/lib/stripe';
import { processStripeEvent } from '@/server/billing/webhook';
import { sendBusinessNotificationEmail } from '@/server/business-email';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return Response.json({ error: 'Webhook is not configured' }, { status: 400 });
  try {
    const payload = await request.text();
    const event = getStripe().webhooks.constructEvent(payload, signature, secret);
    const result = await processStripeEvent(event);
    // メール送信は内部で例外を握りつぶすため失敗してもWebhook自体は成功扱いのまま進む。
    // サーバーレス実行環境ではレスポンス後にプロセスが終了しうるため、void(fire-and-forget)にはせずawaitする
    // (SMTP送信自体は数百ms〜数秒程度で完了する想定で、Webhookを長時間ブロックするものではない)。
    if (result.notification) await sendBusinessNotificationEmail(result.notification);
    return Response.json({ received: true, duplicate: result.duplicate });
  } catch (error) {
    console.error('Stripe webhook failed', error instanceof Error ? error.name : 'UnknownError');
    return Response.json({ error: 'Invalid webhook' }, { status: 400 });
  }
}
