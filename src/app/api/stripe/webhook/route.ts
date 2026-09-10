import { getStripe } from '@/lib/stripe';
import { processStripeEvent } from '@/server/billing/webhook';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return Response.json({ error: 'Webhook is not configured' }, { status: 400 });
  try {
    const payload = await request.text();
    const event = getStripe().webhooks.constructEvent(payload, signature, secret);
    const result = await processStripeEvent(event);
    return Response.json({ received: true, ...result });
  } catch (error) {
    console.error('Stripe webhook failed', error instanceof Error ? error.name : 'UnknownError');
    return Response.json({ error: 'Invalid webhook' }, { status: 400 });
  }
}
