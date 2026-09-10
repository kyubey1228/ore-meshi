import { NextResponse } from 'next/server';
import { getUnreadNotificationCount } from '@/lib/data';
export async function GET() { return NextResponse.json({ count: await getUnreadNotificationCount() }); }
