import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUserId } from '@/server/auth';

// Headerが必要とする認証状態と未読数を1往復で返す。
// /api/auth/sessionとの二重Auth解決を避け、匿名時はDBへ接続しない。
export async function GET() {
  const userId = await currentUserId();
  const count = userId ? await prisma.notification.count({ where: { userId, readAt: null } }) : 0;
  return NextResponse.json({ signedIn: Boolean(userId), count }, { headers: { 'Cache-Control': 'private, no-store' } });
}
