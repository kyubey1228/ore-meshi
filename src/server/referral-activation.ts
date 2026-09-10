import 'server-only';
import { prisma } from '@/lib/prisma';
import { recordGrowthEvent } from '@/server/growth';

// Referral Activated = 被招待者がsignup_completedし、かつ参加(join)または飯成立まで到達した時点。
// signup経由だけでは報酬を確定させない(自己招待・空アカウント量産対策も兼ねる)。
export async function checkReferralActivation(referredUserId: string) {
  try {
    const referral = await prisma.referral.findFirst({ where: { referredUserId, activatedAt: null }, orderBy: { createdAt: 'desc' } });
    if (!referral) return;
    await prisma.referral.update({ where: { id: referral.id }, data: { activatedAt: new Date() } });
    await recordGrowthEvent('REFERRAL_ACTIVATION_COMPLETED', { userId: referredUserId, loggedIn: true });
    await recordGrowthEvent('REFERRAL_REWARD_EARNED', { userId: referral.referrerUserId, loggedIn: true, source: 'referral_activation' });
  } catch (error) {
    console.error('checkReferralActivation failed', error instanceof Error ? error.name : 'UnknownError');
  }
}
