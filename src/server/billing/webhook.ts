import 'server-only';
import { Prisma, type SubscriptionStatus } from '@prisma/client';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { getStripe } from '@/lib/stripe';

function stripeId(value: string | { id: string } | null) {
  return typeof value === 'string' ? value : value?.id ?? null;
}

function subscriptionStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  const values: Partial<Record<Stripe.Subscription.Status, SubscriptionStatus>> = {
    incomplete: 'INCOMPLETE', active: 'ACTIVE', past_due: 'PAST_DUE', canceled: 'CANCELLED', unpaid: 'UNPAID', trialing: 'TRIALING',
    incomplete_expired: 'CANCELLED', paused: 'UNPAID',
  };
  return values[status] ?? 'UNPAID';
}

function period(subscription: Stripe.Subscription) {
  const starts = subscription.items.data.map((item) => item.current_period_start);
  const ends = subscription.items.data.map((item) => item.current_period_end);
  const fallback = Math.floor(Date.now() / 1000);
  return {
    start: new Date((starts.length ? Math.min(...starts) : fallback) * 1000),
    end: new Date((ends.length ? Math.max(...ends) : fallback) * 1000),
  };
}

async function syncSubscription(tx: Prisma.TransactionClient, subscription: Stripe.Subscription) {
  const businessAccountId = subscription.metadata.businessAccountId;
  const customerId = stripeId(subscription.customer);
  const item = subscription.items.data[0];
  if (!businessAccountId || !customerId || !item) throw new Error('Subscription metadata is incomplete');
  const customer = await tx.billingCustomer.findUnique({ where: { businessAccountId } });
  if (!customer || customer.stripeCustomerId !== customerId) throw new Error('Subscription customer mismatch');
  const priceId = item.price.id;
  const plan = priceId === process.env.STRIPE_PRICE_BUSINESS_STANDARD ? 'STANDARD'
    : priceId === process.env.STRIPE_PRICE_BUSINESS_PRO ? 'PRO'
      : null;
  if (!plan) throw new Error('Unknown subscription price');
  const dates = period(subscription);
  const newStatus = subscriptionStatus(subscription.status);
  const existing = await tx.businessSubscription.findUnique({ where: { businessAccountId }, select: { status: true } });
  await tx.businessSubscription.upsert({
    where: { businessAccountId },
    create: {
      businessAccountId, stripeSubscriptionId: subscription.id, stripePriceId: priceId, plan,
      status: newStatus, currentPeriodStart: dates.start, currentPeriodEnd: dates.end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
    update: {
      stripeSubscriptionId: subscription.id, stripePriceId: priceId, plan,
      status: newStatus, currentPeriodStart: dates.start, currentPeriodEnd: dates.end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });
  // 既にACTIVEだった場合(更新のたびに届くWebhook)は再発火しない。新規に有効化した瞬間のみ計測する。
  if (newStatus === 'ACTIVE' && existing?.status !== 'ACTIVE') {
    const sessionKey = subscription.metadata.marketingSessionKey;
    if (sessionKey) await tx.businessMarketingEvent.create({ data: { sessionKey, businessAccountId, eventType: 'SUBSCRIPTION_STARTED', content: plan } });
  }
}

async function completeOrder(tx: Prisma.TransactionClient, session: Stripe.Checkout.Session) {
  const { orderId, businessAccountId, campaignId, orderType } = session.metadata ?? {};
  if (!orderId || !businessAccountId || !campaignId || !orderType) throw new Error('Checkout metadata is incomplete');
  if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') throw new Error('Checkout is not paid');
  const order = await tx.sponsorOrder.findUnique({ where: { id: orderId } });
  if (!order || order.businessAccountId !== businessAccountId || order.campaignId !== campaignId || order.orderType !== orderType || order.stripeCheckoutSessionId !== session.id) {
    throw new Error('Checkout order mismatch');
  }
  const customer = await tx.billingCustomer.findUnique({ where: { businessAccountId } });
  if (!customer || customer.stripeCustomerId !== stripeId(session.customer)) throw new Error('Checkout customer mismatch');
  const paymentIntentId = stripeId(session.payment_intent);
  await tx.sponsorOrder.update({
    where: { id: order.id },
    data: { status: 'PAID', paidAt: new Date(), stripePaymentIntentId: paymentIntentId, amount: session.amount_total, currency: session.currency },
  });
  if (order.orderType === 'SPONSORED_MEAL') {
    const result = await tx.sponsoredMeal.updateMany({ where: { id: campaignId, businessAccountId, status: 'DRAFT' }, data: { status: 'ACTIVE' } });
    if (result.count !== 1 && order.status !== 'PAID') throw new Error('Sponsored meal mismatch');
    if (result.count === 1 && session.metadata?.marketingSessionKey) await tx.businessMarketingEvent.create({ data: { sessionKey: session.metadata.marketingSessionKey, businessAccountId, eventType: 'SPONSORED_MEAL_ACTIVATED' } });
  } else if (order.orderType === 'SEAT_CAMPAIGN') {
    const campaign = await tx.seatCampaign.findFirst({ where: { id: campaignId, businessAccountId } });
    if (!campaign || campaign.endsAt <= new Date()) throw new Error('Seat campaign is expired');
    const result = await tx.seatCampaign.updateMany({ where: { id: campaignId, businessAccountId, status: 'DRAFT' }, data: { status: 'ACTIVE' } });
    if (result.count !== 1 && order.status !== 'PAID') throw new Error('Seat campaign mismatch');
    if (result.count === 1 && session.metadata?.marketingSessionKey) await tx.businessMarketingEvent.create({ data: { sessionKey: session.metadata.marketingSessionKey, businessAccountId, eventType: 'SEAT_CAMPAIGN_ACTIVATED' } });
  } else if (order.orderType === 'AREA_FEATURED') {
    const campaign = await tx.areaSponsorship.findFirst({ where: { id: campaignId, businessAccountId } });
    if (!campaign || campaign.endsAt <= new Date()) throw new Error('Area sponsorship is expired');
    const result = await tx.areaSponsorship.updateMany({ where: { id: campaignId, businessAccountId, status: 'DRAFT' }, data: { status: 'ACTIVE' } });
    if (result.count !== 1 && order.status !== 'PAID') throw new Error('Area sponsorship mismatch');
  }
  if(session.metadata?.marketingSessionKey)await tx.businessMarketingEvent.create({data:{sessionKey:session.metadata.marketingSessionKey,businessAccountId,eventType:'CHECKOUT_COMPLETED'}});
  if(session.metadata?.firstTimeOfferId)await tx.firstTimeOffer.updateMany({where:{id:session.metadata.firstTimeOfferId},data:{usedCount:{increment:1}}});
}

function invoiceSubscriptionId(invoice: Stripe.Invoice) {
  const parent = invoice.parent;
  if (parent?.type !== 'subscription_details') return null;
  return stripeId(parent.subscription_details?.subscription ?? null);
}

export async function processStripeEvent(event: Stripe.Event) {
  let subscription: Stripe.Subscription | null = null;
  if (event.type.startsWith('customer.subscription.')) subscription = event.data.object as Stripe.Subscription;
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.mode === 'subscription') {
      const id = stripeId(session.subscription);
      if (!id) throw new Error('Checkout subscription is missing');
      subscription = await getStripe().subscriptions.retrieve(id);
      if (subscription.metadata.businessAccountId !== session.metadata?.businessAccountId) throw new Error('Subscription checkout mismatch');
    }
  }
  if (event.type === 'invoice.paid' || event.type === 'invoice.payment_failed') {
    const id = invoiceSubscriptionId(event.data.object as Stripe.Invoice);
    if (id) subscription = await getStripe().subscriptions.retrieve(id);
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.stripeWebhookEvent.create({ data: { stripeEventId: event.id, eventType: event.type } });
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'payment') await completeOrder(tx, session);
        else {if(session.metadata?.marketingSessionKey&&session.metadata.businessAccountId)await tx.businessMarketingEvent.create({data:{sessionKey:session.metadata.marketingSessionKey,businessAccountId:session.metadata.businessAccountId,eventType:'CHECKOUT_COMPLETED'}});if(session.metadata?.firstTimeOfferId)await tx.firstTimeOffer.updateMany({where:{id:session.metadata.firstTimeOfferId},data:{usedCount:{increment:1}}});}
      } else if (event.type === 'checkout.session.expired') {
        const session = event.data.object as Stripe.Checkout.Session;
        await tx.sponsorOrder.updateMany({ where: { stripeCheckoutSessionId: session.id, status: 'PENDING_PAYMENT' }, data: { status: 'CANCELLED' } });
      } else if (event.type === 'payment_intent.payment_failed') {
        const intent = event.data.object as Stripe.PaymentIntent;
        const orderId = intent.metadata.orderId;
        if (orderId) {
          await tx.sponsorOrder.updateMany({
            where: { id: orderId, businessAccountId: intent.metadata.businessAccountId, campaignId: intent.metadata.campaignId, status: 'PENDING_PAYMENT' },
            data: { status: 'FAILED', stripePaymentIntentId: intent.id },
          });
        }
      }
      if (subscription) await syncSubscription(tx, subscription);
    });
    return { duplicate: false };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = String(error.meta?.target ?? '');
      if (target.includes('stripeEventId')) return { duplicate: true };
    }
    throw error;
  }
}
