import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/server/auth';
import { createMobileAuthorizationCode, mobileAuthRequestSchema } from '@/server/mobile-auth';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = mobileAuthRequestSchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return new Response('Invalid mobile authentication request.', { status: 400 });
  const session = await getServerSession(authOptions);
  if (!session?.user.id) {
    const login = new URL('/login', url.origin);
    login.searchParams.set('next', `${url.pathname}?${url.searchParams.toString()}`);
    return NextResponse.redirect(login);
  }
  const code = await createMobileAuthorizationCode(session.user.id, parsed.data.code_challenge);
  const callback = new URL(parsed.data.return_uri);
  callback.searchParams.set('code', code);
  callback.searchParams.set('state', parsed.data.state);
  return NextResponse.redirect(callback);
}
