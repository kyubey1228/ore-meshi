'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserRound } from 'lucide-react';

// デスクトップのHeaderAccountStateと同じ考え方: /business配下では一般ユーザー向け/mypageではなく
// 店舗専用のアカウント設定ページへ誘導する。
export function MobileAccountLink() {
  const pathname = usePathname();
  const inBusinessContext = pathname?.startsWith('/business') ?? false;
  return <Link href={inBusinessContext ? '/business/account' : '/mypage'}><UserRound size={20} />{inBusinessContext ? 'アカウント' : 'マイページ'}</Link>;
}
