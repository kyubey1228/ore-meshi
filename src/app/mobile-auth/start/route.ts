import { NextResponse } from 'next/server';
import { mobileAuthRequestSchema } from '@/server/mobile-auth';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = mobileAuthRequestSchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return new Response('Invalid mobile authentication request.', { status: 400 });
  const complete = new URL('/mobile-auth/complete', url.origin);
  complete.search = new URLSearchParams(parsed.data).toString();
  const login = new URL('/login', url.origin);
  login.searchParams.set('next', `${complete.pathname}?${complete.searchParams.toString()}`);
  return NextResponse.redirect(login);
}
