export type LifecycleAccount = { createdAt: Date; campaignCount: number; subscription?: { cancelAtPeriodEnd: boolean; currentPeriodEnd: Date } | null };
export function evaluateBusinessLifecycle(account: LifecycleAccount, now = new Date()) {
  const ageDays = (now.getTime() - account.createdAt.getTime()) / 86_400_000;
  const daysUntilEnd = account.subscription ? (account.subscription.currentPeriodEnd.getTime() - now.getTime()) / 86_400_000 : null;
  return {
    needsActivationReminder: account.campaignCount === 0 && ageDays >= 3 && ageDays <= 10,
    subscriptionEnding: Boolean(account.subscription?.cancelAtPeriodEnd && daysUntilEnd !== null && daysUntilEnd > 0 && daysUntilEnd <= 7),
  };
}

// 期間終了(endsAt)が近い/過ぎた掲載枠について、「まだ閲覧0件」を知らせるか「実績サマリー」を
// 知らせるかを判定する。終了2時間前を「間近」の基準とする(既存のSeatCampaign運用に合わせる)。
export type CampaignWindowInput = { endsAt: Date; views: number };
export function evaluateCampaignWindow(input: CampaignWindowInput, now = new Date()) {
  const withinEndingWindow = input.endsAt.getTime() - now.getTime() <= 2 * 3_600_000;
  if (!withinEndingWindow) return { noViews: false, summary: false };
  const ended = input.endsAt.getTime() <= now.getTime();
  return { noViews: !ended && input.views === 0, summary: ended };
}
