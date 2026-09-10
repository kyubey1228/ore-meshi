'use client';
import { useEffect } from 'react';
import Link, { type LinkProps } from 'next/link';
import type { AnchorHTMLAttributes } from 'react';
import type { GrowthEvent, GrowthEventPayload } from '@/lib/growth-events';

export type { GrowthEvent, GrowthEventPayload } from '@/lib/growth-events';

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  return document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`))?.[1];
}

// 初回流入時のutm_*をCookieに保存し、以降のページ遷移後のイベント(signup_completed等)にも
// 同じキャンペーン情報を付与できるようにする(ファーストタッチ・アトリビューション、30日)。
function getUtmParams(): { source?: string; utmMedium?: string; utmCampaign?: string; utmContent?: string; utmTerm?: string } {
  if (typeof location === 'undefined') return {};
  const q = new URLSearchParams(location.search);
  const fromUrl = {
    source: q.get('utm_source') ?? undefined,
    utmMedium: q.get('utm_medium') ?? undefined,
    utmCampaign: q.get('utm_campaign') ?? undefined,
    utmContent: q.get('utm_content') ?? undefined,
    utmTerm: q.get('utm_term') ?? undefined,
  };
  if (fromUrl.source || fromUrl.utmMedium || fromUrl.utmCampaign) {
    try { document.cookie = `ore_utm=${encodeURIComponent(JSON.stringify(fromUrl))}; max-age=${60 * 60 * 24 * 30}; path=/; samesite=lax`; } catch { /* noop */ }
    return fromUrl;
  }
  const stored = readCookie('ore_utm');
  if (!stored) return {};
  try { return JSON.parse(decodeURIComponent(stored)); } catch { return {}; }
}

export function trackGrowthEvent(eventType: GrowthEvent, payload: GrowthEventPayload = {}) {
  const utm = getUtmParams();
  void fetch('/api/growth-events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      eventType,
      source: payload.source ?? utm.source,
      utmMedium: payload.utmMedium ?? utm.utmMedium,
      utmCampaign: payload.utmCampaign ?? utm.utmCampaign,
      referrer: payload.referrer ?? (typeof document !== 'undefined' ? document.referrer || undefined : undefined),
      ...payload,
    }),
  }).catch(() => {});
}

export function GrowthTracker({ eventType, ...payload }: { eventType: GrowthEvent } & GrowthEventPayload) {
  useEffect(() => {
    trackGrowthEvent(eventType, payload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventType, payload.recruitmentId]);
  return null;
}

export function TrackedLink({ eventType, payload, ...props }: { eventType: GrowthEvent; payload?: GrowthEventPayload } & LinkProps & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <Link {...props} onClick={() => trackGrowthEvent(eventType, payload)} />;
}
