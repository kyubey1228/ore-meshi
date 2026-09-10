import 'server-only';
import { Prisma, type SubscriptionStatus } from '@prisma/client';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { getStripe } from '@/lib/stripe';

export type BusinessNotification =
  | { kind: 'SPONSORED_MEAL_PAID'; businessAccountId: string; mealId: string | null }
  | { kind: 'SEAT_CAMPAIGN_PAID'; businessAccountId: string }
  | { kind: 'AREA_FEATURED_PAID'; businessAccountId: string }
  | { kind: 'SUBSCRIPTION_UPDATED'; businessAccountId: string; plan: string };

function stripeId(value: string | { id: string } | null) {
  return typeof value === 'string' ? value : value?.id ?? null;
}

// StripeのCheckout Session作成時にstartsAt(JST壁時計時刻)をUTC instantへ変換して保存しているため、
// 逆変換もIntl経由でJST基準の日付/時刻文字列を取り出す(サーバーのローカルTZに依存しない)。
function jstDateAndTime(date: Date) {
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  const parts = Object.fromEntries(fmt.formatToParts(date).map(p => [p.type, p.value]));
  const hour = parts.hour === '24' ? '00' : parts.hour;
  return { dateOnly: `${parts.year}-${parts.month}-${parts.day}`, time: `${hour}:${parts.minute}` };
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

async function syncSubscription(tx: Prisma.TransactionClient, subscription: Stripe.Subscription): Promise<BusinessNotification | null> {
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
  const existing = await tx.businessSubscription.findUnique({ where: { businessAccountId }, select: { status: true, plan: true } });
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
  // 既にACTIVEかつ同じプランだった場合(更新のたびに届くWebhook)は再発火しない。新規有効化/プラン変更の瞬間のみ計測する。
  const isNewOrChanged = newStatus === 'ACTIVE' && (existing?.status !== 'ACTIVE' || existing.plan !== plan);
  if (isNewOrChanged) {
    const sessionKey = subscription.metadata.marketingSessionKey;
    if (sessionKey) await tx.businessMarketingEvent.create({ data: { sessionKey, businessAccountId, eventType: existing?.status === 'ACTIVE' ? 'CHECKOUT_COMPLETED' : 'SUBSCRIPTION_STARTED', content: plan } });
    return { kind: 'SUBSCRIPTION_UPDATED', businessAccountId, plan };
  }
  return null;
}

// スポンサー飯は「別のマッチングシステム」にせず、必ず通常のMeal(→JoinRequest→Match→Completed)を
// 経由させる。支払い確定の直前まで実Mealは作らず(Meal.statusにDRAFTが無いため、未払い状態を公開しない
// という既存の安全設計を、Meal自体を未作成のままにすることで踏襲する)、Webhookで一度だけ作成する。
async function createMealForSponsoredMeal(tx: Prisma.TransactionClient, sponsoredMeal: { id: string; businessAccountId: string; title: string; restaurantName: string; area: string; genre: string | null; startsAt: Date; participantLimit: number; benefit: string; description: string }) {
  const owner = await tx.businessMember.findFirst({ where: { businessAccountId: sponsoredMeal.businessAccountId, role: 'OWNER' }, orderBy: { createdAt: 'asc' }, select: { userId: true } });
  if (!owner) throw new Error('Sponsored meal has no owner to host the meal');
  const start = sponsoredMeal.startsAt;
  const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
  const { dateOnly, time: startTime } = jstDateAndTime(start);
  const { time: endTime } = jstDateAndTime(end);
  const maxParticipants = Math.max(2, sponsoredMeal.participantLimit);
  const meal = await tx.meal.create({
    data: {
      hostId: owner.userId,
      title: sponsoredMeal.title,
      description: [sponsoredMeal.description, sponsoredMeal.benefit ? `【スポンサー特典】${sponsoredMeal.benefit}` : ''].filter(Boolean).join('\n\n'),
      area: sponsoredMeal.area,
      restaurant: sponsoredMeal.restaurantName,
      genre: sponsoredMeal.genre,
      budgetMin: 0,
      budgetMax: 0,
      paymentType: 'HOST_PAYS',
      maxParticipants,
      status: 'OPEN',
      candidates: { create: [{ date: new Date(`${dateOnly}T00:00:00.000Z`), startTime, endTime }] },
    },
  });
  return meal.id;
}

async function completeOrder(tx: Prisma.TransactionClient, session: Stripe.Checkout.Session): Promise<BusinessNotification | null> {
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
  let notification: BusinessNotification | null = null;
  if (order.orderType === 'SPONSORED_MEAL') {
    const sponsoredMeal = await tx.sponsoredMeal.findFirst({ where: { id: campaignId, businessAccountId, status: 'DRAFT' } });
    if (!sponsoredMeal) {
      if (order.status !== 'PAID') throw new Error('Sponsored meal mismatch');
    } else {
      // 冪等性: 既にmealIdが付いていれば(重複Webhook)Mealを二重作成しない。
      const mealId = sponsoredMeal.mealId ?? await createMealForSponsoredMeal(tx, sponsoredMeal);
      await tx.sponsoredMeal.update({ where: { id: sponsoredMeal.id }, data: { status: 'ACTIVE', mealId } });
      if (session.metadata?.marketingSessionKey) await tx.businessMarketingEvent.create({ data: { sessionKey: session.metadata.marketingSessionKey, businessAccountId, eventType: 'SPONSORED_MEAL_ACTIVATED' } });
      notification = { kind: 'SPONSORED_MEAL_PAID', businessAccountId, mealId };
    }
  } else if (order.orderType === 'SEAT_CAMPAIGN') {
    const campaign = await tx.seatCampaign.findFirst({ where: { id: campaignId, businessAccountId } });
    if (!campaign || campaign.endsAt <= new Date()) throw new Error('Seat campaign is expired');
    const result = await tx.seatCampaign.updateMany({ where: { id: campaignId, businessAccountId, status: 'DRAFT' }, data: { status: 'ACTIVE' } });
    if (result.count !== 1 && order.status !== 'PAID') throw new Error('Seat campaign mismatch');
    if (result.count === 1) {
      if (session.metadata?.marketingSessionKey) await tx.businessMarketingEvent.create({ data: { sessionKey: session.metadata.marketingSessionKey, businessAccountId, eventType: 'SEAT_CAMPAIGN_ACTIVATED' } });
      notification = { kind: 'SEAT_CAMPAIGN_PAID', businessAccountId };
    }
  } else if (order.orderType === 'AREA_FEATURED') {
    const campaign = await tx.areaSponsorship.findFirst({ where: { id: campaignId, businessAccountId } });
    if (!campaign || campaign.endsAt <= new Date()) throw new Error('Area sponsorship is expired');
    const result = await tx.areaSponsorship.updateMany({ where: { id: campaignId, businessAccountId, status: 'DRAFT' }, data: { status: 'ACTIVE' } });
    if (result.count !== 1 && order.status !== 'PAID') throw new Error('Area sponsorship mismatch');
    if (result.count === 1) notification = { kind: 'AREA_FEATURED_PAID', businessAccountId };
  }
  if(session.metadata?.marketingSessionKey)await tx.businessMarketingEvent.create({data:{sessionKey:session.metadata.marketingSessionKey,businessAccountId,eventType:'CHECKOUT_COMPLETED'}});
  if(session.metadata?.firstTimeOfferId)await tx.firstTimeOffer.updateMany({where:{id:session.metadata.firstTimeOfferId},data:{usedCount:{increment:1}}});
  return notification;
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

  let notification: BusinessNotification | null = null;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.stripeWebhookEvent.create({ data: { stripeEventId: event.id, eventType: event.type } });
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'payment') notification = await completeOrder(tx, session);
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
      if (subscription) notification = await syncSubscription(tx, subscription) ?? notification;
    });
    return { duplicate: false, notification };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = String(error.meta?.target ?? '');
      if (target.includes('stripeEventId')) return { duplicate: true, notification: null };
    }
    throw error;
  }
}
