export const E2E_PREFIX = 'e2e-ore-meshi';
export const users = {
  user1: { twitterId: `${E2E_PREFIX}-user-1`, username: 'e2e_user_1', name: 'E2E ユーザー1' },
  user2: { twitterId: `${E2E_PREFIX}-user-2`, username: 'e2e_user_2', name: 'E2E ユーザー2' },
  user3: { twitterId: `${E2E_PREFIX}-user-3`, username: 'e2e_user_3', name: 'E2E ユーザー3' },
  business: { twitterId: `${E2E_PREFIX}-business`, username: 'e2e_business', name: 'E2E 店舗オーナー' },
} as const;
export const statePath = (key: keyof typeof users) => `e2e/.auth/${key}.json`;
export const mealTitle = `${E2E_PREFIX}-二人飯`;
export const multiMealTitle = `${E2E_PREFIX}-複数人飯`;

// Billing E2E専用。通常のE2E(global-setup.ts)とはビジネスアカウント/認証状態を分け、
// 誤ってどちらかの実行がもう一方のfixtureファイルを上書きしないようにする。
export const billingBusinessSlug = `${E2E_PREFIX}-billing-business`;
export const billingBusinessStatePath = 'e2e/.auth/billing-business.json';
export const billingFixturePath = 'e2e/.auth/billing-fixture.json';
