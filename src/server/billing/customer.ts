import 'server-only';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getStripe } from '@/lib/stripe';

export async function getOrCreateBillingCustomer(businessAccountId: string) {
  const existing = await prisma.billingCustomer.findUnique({ where: { businessAccountId } });
  if (existing) return existing;

  const business = await prisma.businessAccount.findUniqueOrThrow({ where: { id: businessAccountId } });
  const customer = await getStripe().customers.create(
    { name: business.name, metadata: { businessAccountId } },
    { idempotencyKey: `business-customer:${businessAccountId}` },
  );
  try {
    return await prisma.billingCustomer.create({
      data: { businessAccountId, stripeCustomerId: customer.id },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return prisma.billingCustomer.findUniqueOrThrow({ where: { businessAccountId } });
    }
    throw error;
  }
}

