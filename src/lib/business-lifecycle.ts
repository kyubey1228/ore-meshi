export type LifecycleAccount = { createdAt: Date; campaignCount: number; subscription?: { cancelAtPeriodEnd: boolean; currentPeriodEnd: Date } | null };
export function evaluateBusinessLifecycle(account: LifecycleAccount, now = new Date()) {
  const ageDays = (now.getTime() - account.createdAt.getTime()) / 86_400_000;
  const daysUntilEnd = account.subscription ? (account.subscription.currentPeriodEnd.getTime() - now.getTime()) / 86_400_000 : null;
  return {
    needsActivationReminder: account.campaignCount === 0 && ageDays >= 3 && ageDays <= 10,
    subscriptionEnding: Boolean(account.subscription?.cancelAtPeriodEnd && daysUntilEnd !== null && daysUntilEnd > 0 && daysUntilEnd <= 7),
  };
}
