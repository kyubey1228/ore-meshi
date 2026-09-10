'use client';
import { useEffect,useRef } from 'react';
import { trackBusinessMarketing, type MarketingEvent } from '@/components/business-marketing-tracker';
export function BusinessTrackedSection({eventType,id,className='section',children}:{eventType:MarketingEvent;id?:string;className?:string;children:React.ReactNode}){const ref=useRef<HTMLElement>(null);useEffect(()=>{if(!ref.current)return;const observer=new IntersectionObserver(([entry])=>{if(entry.isIntersecting){trackBusinessMarketing(eventType,id);observer.disconnect();}},{threshold:.25});observer.observe(ref.current);return()=>observer.disconnect();},[eventType,id]);return <section ref={ref} id={id} className={className}>{children}</section>;}
