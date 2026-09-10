'use client';
import { useEffect } from 'react';
import Link, { type LinkProps } from 'next/link';
import type { AnchorHTMLAttributes } from 'react';

export type GrowthEvent =
  | 'SIGNUP_CTA_VIEW' | 'SIGNUP_STARTED' | 'SIGNUP_COMPLETED'
  | 'RECRUITMENT_VIEWED' | 'RECRUITMENT_JOIN_CLICKED' | 'RECRUITMENT_CREATE_CLICKED'
  | 'RECRUITMENT_SHARED' | 'RECRUITMENT_SHARE_X' | 'RECRUITMENT_SHARE_LINE' | 'RECRUITMENT_URL_COPIED'
  | 'ONBOARDING_STARTED' | 'ONBOARDING_COMPLETED' | 'RECRUITMENT_JOIN_COMPLETED';

export type GrowthEventPayload = {
  recruitmentId?: string;
  area?: string;
  foodCategory?: string;
  loggedIn?: boolean;
  source?: string;
  referrer?: string;
  shareType?: string;
};

export function trackGrowthEvent(eventType: GrowthEvent, payload: GrowthEventPayload = {}) {
  const q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
  void fetch('/api/growth-events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      eventType,
      source: payload.source ?? q?.get('utm_source') ?? undefined,
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
