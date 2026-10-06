import { NextResponse } from 'next/server';
import { processBusinessLifecycleBatch } from '@/server/business-lifecycle';
import { hasValidCronSecret } from '@/lib/security';

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!hasValidCronSecret(request)) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 50, 1), 200);
  try { return NextResponse.json({ ok: true, ...(await processBusinessLifecycleBatch(url.searchParams.get('cursor'), limit)) }); }
  catch (error) { console.error('[BUSINESS_LIFECYCLE] failed', error); return NextResponse.json({ ok: false, error: 'lifecycle processing failed' }, { status: 500 }); }
}
