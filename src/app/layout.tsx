import type { Metadata } from 'next';
import Link from 'next/link';
import { Utensils, Plus, Search } from 'lucide-react';
import { FavoritesMerge } from '@/components/favorites-merge';
import { HeaderAccountState } from '@/components/auth-nav-state';
import { MobileAccountLink } from '@/components/mobile-account-link';
import './globals.css';
export const metadata:Metadata={title:{default:'俺は誰かと飯が食いたい！',template:'%s | 俺は誰かと飯が食いたい！'},description:'今日、誰かと飯食わない？ 食べたい気持ちでつながる、気軽なごはんの募集サービス。'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ja"><body><a href="#main" className="skip-link">本文へ</a><FavoritesMerge/><header className="site-header"><Link className="brand" href="/"><span className="brand-icon"><Utensils size={21}/></span><span>俺は誰かと<br/>飯が食いたい<span className="orange">！</span></span></Link><nav><Link href="/business" className="desktop-link">店舗・企業向け</Link><Link href="/meals" className="desktop-link">飯を探す</Link><HeaderAccountState/><Link className="btn small" href="/meals/new"><Plus size={17}/>飯を募集する</Link></nav></header><main id="main">{children}</main><footer className="site-footer"><Link className="brand" href="/">俺は誰かと飯が食いたい！</Link><p>うまい飯は、誰かと食うともっとうまい。</p><nav className="footer-business-links" aria-label="店舗・企業向け"><Link href="/business">店舗・企業の方へ</Link><Link href="/business/partner">スポンサー募集</Link><Link href="/business/pricing">料金</Link></nav><small>© {new Date().getFullYear()} 俺は誰かと飯が食いたい！</small></footer><nav className="mobile-nav"><Link href="/meals"><Search size={20}/>飯を探す</Link><Link href="/meals/new"><Plus size={20}/>飯を募集する</Link><MobileAccountLink/></nav></body></html>;}
