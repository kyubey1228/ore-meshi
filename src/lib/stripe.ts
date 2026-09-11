import 'server-only';
import Stripe from 'stripe';
import { assertStripeTestMode } from '@/lib/stripe-test-mode';

let client: Stripe | undefined;

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not configured');
  // E2E_BILLING_MODEはBilling E2E専用のサーバー起動時にのみ設定される(本番では絶対に設定しない)。
  // このモードで動いているのに本番キーが渡っていたら、実際の決済を作る前に即座に落とす。
  if (process.env.E2E_BILLING_MODE === 'true') assertStripeTestMode(secretKey, 'getStripe');
  return client ??= new Stripe(secretKey);
}

