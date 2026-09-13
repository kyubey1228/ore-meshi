'use client';
import { useEffect } from 'react';
import { enqueueAnalyticsEvent } from '@/lib/analytics-queue';
export type MarketingEvent='LP_VIEW'|'BUSINESS_BANNER_IMPRESSION'|'BUSINESS_BANNER_CLICK'|'BUSINESS_LP_VIEW'|'SPONSORED_MEAL_SECTION_VIEW'|'SEAT_CAMPAIGN_SECTION_VIEW'|'PRICING_CTA_CLICK'|'CONTACT_CTA_CLICK'|'BUSINESS_SIGNUP_CTA_CLICK'|'PARTNER_CTA_CLICK'|'PRICING_VIEW'|'CONTACT_STARTED'|'SIGNUP_STARTED'|'SPONSOR_PRODUCT_VIEW';
export function trackBusinessMarketing(eventType: MarketingEvent, content?: string, referralCode?: string) {
  if (typeof location === 'undefined') return;
  const q = new URLSearchParams(location.search);
  enqueueAnalyticsEvent('/api/business-marketing', {
    eventType,
    referralCode: referralCode && referralCode.trim().length <= 50 ? referralCode.trim() : undefined,
    source: q.get('utm_source')?.trim().slice(0, 100),
    medium: q.get('utm_medium')?.trim().slice(0, 100),
    campaign: q.get('utm_campaign')?.trim().slice(0, 150),
    content: (content ?? q.get('utm_content'))?.trim().slice(0, 150),
  });
}

export function BusinessMarketingTracker({ eventType, referralCode, content }: { eventType: MarketingEvent; referralCode?: string; content?: string }) {
  useEffect(() => { trackBusinessMarketing(eventType, content, referralCode); }, [eventType, referralCode, content]);
  return null;
}
