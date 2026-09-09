import 'server-only';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { currentUserId } from '@/server/auth';
export type ActionResult = { ok: boolean; message: string; href?: string };
export class UserError extends Error {}
export function ensure(condition: unknown, message = 'この操作を行う権限がありません。'): asserts condition { if (!condition) throw new UserError(message); }
export async function transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt=0; ;attempt++) {
    try { return await prisma.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
    catch(error) { if(error instanceof Prisma.PrismaClientKnownRequestError && error.code==='P2034' && attempt<3) continue; throw error; }
  }
}
export async function perform(fn: (userId: string) => Promise<string | void>): Promise<ActionResult> {
  try {
    const id = await currentUserId(); ensure(id, 'Twitter/Xでログインしてください。');
    const href = await fn(id);
    revalidatePath('/', 'layout');
    return {ok:true,message:'保存しました。',...(href ? {href}: {})};
  } catch(error) {
    if(error instanceof UserError) return {ok:false,message:error.message};
    if(error instanceof z.ZodError) return {ok:false,message:`入力を確認してください。${error.issues[0]?.message ?? ''}`};
    if(error instanceof Prisma.PrismaClientKnownRequestError && error.code==='P2002') return {ok:false,message:'すでに登録されています。重複して送信することはできません。'};
    console.error('Server action failed', error instanceof Error ? error.name : 'UnknownError');
    return {ok:false,message:'保存できませんでした。少し待ってからもう一度お試しください。'};
  }
}
export async function participantMatch(tx: Prisma.TransactionClient, matchId: string, userId: string) {
  const match = await tx.match.findUnique({where:{id:matchId},include:{participants:true,meal:true}});
  ensure(match,'その飯の予定が見つかりません。');
  ensure(match.participants.some(p=>p.userId===userId));
  return match;
}
