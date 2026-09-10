import 'server-only';
import { prisma } from '@/lib/prisma';
import { currentUserId } from '@/server/auth';
import { ensure } from '@/server/action';

export async function requireBillingMembership(businessAccountId?: string) {
  const userId = await currentUserId();
  ensure(userId, 'Twitter/Xでログインしてください。');
  const membership = await prisma.businessMember.findFirst({
    where: {
      userId,
      role: { in: ['OWNER', 'ADMIN'] },
      ...(businessAccountId ? { businessAccountId } : {}),
    },
    include: { businessAccount: true },
    orderBy: { createdAt: 'asc' },
  });
  ensure(membership, '店舗の支払いを管理する権限がありません。');
  ensure(membership.businessAccount.status === 'ACTIVE', 'この店舗アカウントは現在利用できません。');
  return membership;
}

