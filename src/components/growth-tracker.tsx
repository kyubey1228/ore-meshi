'use client';
import { useEffect } from 'react';
import Link, { type LinkProps } from 'next/link';
import type { AnchorHTMLAttributes } from 'react';
import type { GrowthEvent, GrowthEventPayload } from '@/lib/growth-events';

export type { GrowthEvent, GrowthEventPayload } from '@/lib/growth-events';

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
