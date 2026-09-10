import { NextResponse } from 'next/server';
import { processBusinessLifecycleBatch } from '@/server/business-lifecycle';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = request.headers.get('x-cron-secret') ?? url.searchParams.get('secret');
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 50, 1), 200);
  try { return NextResponse.json({ ok: true, ...(await processBusinessLifecycleBatch(url.searchParams.get('cursor'), limit)) }); }
  catch (error) { console.error('[BUSINESS_LIFECYCLE] failed', error); return NextResponse.json({ ok: false, error: 'lifecycle processing failed' }, { status: 500 }); }
}
