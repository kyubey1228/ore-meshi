// Billing E2Eが本番Stripeキーで決済を実行してしまう事故を防ぐための唯一のゲート。
// 「test modeでなければskipしてCIをGreenにする」のではなく、ここで例外を投げて即座に落とす。
export function isStripeTestModeKey(key: string | undefined | null): boolean {
  return Boolean(key && key.startsWith('sk_test_'));
}

export function assertStripeTestMode(key: string | undefined | null, context: string): void {
  if (isStripeTestModeKey(key)) return;
  throw new Error(
    `[${context}] STRIPE_SECRET_KEY is not a Stripe TEST MODE key (must start with "sk_test_"). ` +
    'Refusing to proceed: this would otherwise create a REAL Stripe Checkout Session against a live/production account. ' +
    'Set E2E_STRIPE_SECRET_KEY (and the other E2E_STRIPE_* variables) to Stripe TEST MODE credentials before running Billing E2E. See .env.example.',
  );
}
