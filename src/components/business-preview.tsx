'use client';
import Image from 'next/image';
import { useState } from 'react';
export function PreviewFrame({name,alt,children}:{name:'dashboard'|'sponsored-meal'|'seat-campaign'|'x-share'|'analytics';alt:string;children:React.ReactNode}){const[failed,setFailed]=useState(false);const screenshots=process.env.NEXT_PUBLIC_BUSINESS_PREVIEW_MODE==='screenshots';return <div className="product-preview">{screenshots&&!failed?<Image src={`/business/screenshots/${name}.webp`} alt={alt} width={1200} height={760} loading="lazy" onError={()=>setFailed(true)}/>:children}</div>;}
export function PreviewStat({value,label}:{value:string;label:string}){return <div><strong>{value}</strong><span>{label}</span></div>;}
