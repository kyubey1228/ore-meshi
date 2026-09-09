'use client';
import { Share2 } from 'lucide-react';
export function XShareButton({href,label='Xで誰か呼ぶ',className='btn dark-btn'}:{href:string;label?:string;className?:string}){
  return <a className={className} href={href} target="_blank" rel="noopener noreferrer"><Share2 size={17}/>{label}</a>;
}
