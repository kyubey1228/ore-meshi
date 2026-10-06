import { NextResponse } from 'next/server';
import { forwardInboundMail } from '@/server/mail-forward';
import { hasValidCronSecret } from '@/lib/security';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  if (!hasValidCronSecret(request)) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  try { return NextResponse.json({ ok: true, ...(await forwardInboundMail()) }); }
  catch (error) {
    console.error('Mail forwarding failed', error instanceof Error ? error.message : 'UnknownError');
    return NextResponse.json({ ok: false, error: 'mail_forward_failed' }, { status: 500 });
  }
}
