'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';

let sessionRequest: Promise<unknown> | undefined;
function loadSession() { return sessionRequest ??= fetch('/api/auth/session').then(response => response.json()); }

function useSessionState() {
  const [state, setState] = useState<{ signedIn: boolean; unread: number } | null>(null);
  useEffect(() => { void Promise.all([loadSession(), fetch('/api/notifications/unread').then(r => r.ok ? r.json() : { count: 0 })]).then(([session, unread]) => setState({ signedIn: Boolean((session as {user?:unknown})?.user), unread: unread.count ?? 0 })).catch(() => setState({ signedIn: false, unread: 0 })); }, []);
  return state;
}

// /business配下では、店舗オーナーが一般ユーザー向けの「マイページ(MY TABLE)」に迷い込まないよう
// アカウントリンクの行き先とラベルを店舗専用のアカウント設定ページへ切り替える。
export function useAccountHref(signedIn: boolean | undefined) {
  const pathname = usePathname();
  const inBusinessContext = pathname?.startsWith('/business') ?? false;
  if (!signedIn) return { href: inBusinessContext ? '/business/login' : '/login', label: 'ログイン' };
  return inBusinessContext ? { href: '/business/account', label: 'アカウント' } : { href: '/mypage', label: 'マイページ' };
}

export function HeaderAccountState() {
  const state = useSessionState();
  const account = useAccountHref(state?.signedIn);
  return <>{state?.signedIn && <Link href="/notifications" className="notification-bell" aria-label={state.unread ? `通知 未読${state.unread}件` : '通知'}><Bell size={19} />{state.unread > 0 && <span className="notification-badge">{state.unread > 9 ? '9+' : state.unread}</span>}</Link>}<Link href={account.href} className="nav-user"><UserRound size={18} /><span>{account.label}</span></Link></>;
}

export function HomeLoginHint() { const state = useSessionState(); return state?.signedIn === false ? <Link className="login-hint" href="/login">𝕏 Twitter/Xで気軽にはじめる →</Link> : null; }
