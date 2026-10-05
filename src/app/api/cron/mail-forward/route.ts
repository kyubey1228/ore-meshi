import { NextResponse } from 'next/server';
import { forwardInboundMail } from '@/server/mail-forward';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = request.headers.get('x-cron-secret') ?? url.searchParams.get('secret');
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  try { return NextResponse.json({ ok: true, ...(await forwardInboundMail()) }); }
  catch (error) {
    console.error('Mail forwarding failed', error instanceof Error ? error.message : 'UnknownError');
    return NextResponse.json({ ok: false, error: 'mail_forward_failed' }, { status: 500 });
  }
}
