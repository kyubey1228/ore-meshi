'use client';
import Link from 'next/link';
import type { ComponentProps } from 'react';
import { trackBusinessMarketing, type MarketingEvent } from '@/components/business-marketing-tracker';
type Props=ComponentProps<typeof Link>&{eventType:MarketingEvent;placement?:string};
export function BusinessMarketingLink({eventType,placement,onClick,...props}:Props){return <Link {...props} onClick={event=>{trackBusinessMarketing(eventType,placement);onClick?.(event);}}/>;}
