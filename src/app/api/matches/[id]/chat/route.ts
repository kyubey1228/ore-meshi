import { prisma } from '@/lib/prisma';
import { currentUserId } from '@/server/auth';
import { transaction } from '@/server/action';
import { chatInputSchema, chatState, type ChatMessage } from '@/lib/match-chat';
import { databaseTable } from '@/server/database-table';
import { databaseJsonDate } from '@/lib/database-json';
import { appUrl } from '@/lib/social';
import { idSchema } from '@/validators';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };
const select = { id: true, senderId: true, body: true, createdAt: true } as const;
function reply(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } });
}

export async function GET(_request: Request, context: Context) {
  try {
    const userId = await currentUserId();
    if (!userId) return reply({ error: 'ログインしてください。' }, 401);
    const parsed = idSchema.safeParse((await context.params).id);
    if (!parsed.success) return reply({ error: 'チャットが見つかりません。' }, 404);
    // Read membership, lifecycle and bounded history in one database snapshot.
    const [match] = await prisma.$queryRaw<{ status: string; mealStatus: string; messages: ChatMessage[] }[]>`
      SELECT m.status, meal.status AS "mealStatus",
        COALESCE((SELECT jsonb_agg(history ORDER BY history."createdAt", history.id) FROM (
          SELECT c.id, c."senderId", c.body, c."createdAt", jsonb_build_object('displayName', u."displayName") AS sender
          FROM ${databaseTable('MatchChatMessage')} c
          JOIN ${databaseTable('User')} u ON u.id = c."senderId"
          WHERE c."matchId" = m.id AND m.status = 'ACTIVE' AND meal.status = 'MATCHED'
          ORDER BY c."createdAt" DESC, c.id DESC LIMIT 50
        ) history), '[]'::jsonb) AS messages
      FROM ${databaseTable('Match')} m JOIN ${databaseTable('Meal')} meal ON meal.id = m."mealId"
      WHERE m.id = ${parsed.data} AND EXISTS (
        SELECT 1 FROM ${databaseTable('MatchParticipant')} p WHERE p."matchId" = m.id AND p."userId" = ${userId}
      )
    `;
    if (!match) return reply({ error: 'チャットが見つかりません。' }, 404);
    const state = chatState(match.status, match.mealStatus);
    return reply({ state, messages: state === 'OPEN' ? match.messages.map(message => ({ ...message, createdAt: databaseJsonDate(message.createdAt).toISOString() })) : [] });
  } catch (error) {
    console.error('Chat read failed', error instanceof Error ? error.name : 'UnknownError');
    return reply({ error: 'チャットを取得できませんでした。少し待ってから再試行してください。' }, 503);
  }
}

async function readInput(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Missing body');
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8192) { await reader.cancel(); throw new Error('Body too large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return chatInputSchema.parse(JSON.parse(Buffer.concat(chunks).toString('utf8')));
}

export async function POST(request: Request, context: Context) {
  const rateLimitSince = new Date(Date.now() - 3000);
  const origin = request.headers.get('origin');
  if (request.headers.get('sec-fetch-site') === 'cross-site' || !origin ||
      ![new URL(request.url).origin, new URL(process.env.NEXTAUTH_URL || appUrl()).origin].includes(origin)) {
    return reply({ error: 'この送信元からは操作できません。' }, 403);
  }
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') {
    return reply({ error: 'JSON形式で送信してください。' }, 415);
  }
  try {
    const userId = await currentUserId();
    if (!userId) return reply({ error: 'ログインしてください。' }, 401);
    const parsed = idSchema.safeParse((await context.params).id);
    if (!parsed.success) return reply({ error: 'チャットが見つかりません。' }, 404);
    let input;
    try { input = await readInput(request); }
    catch { return reply({ error: 'メッセージは1〜1000文字で入力してください。' }, 400); }
    const { body, clientMessageId } = input;
    const id = parsed.data;
    const result = await transaction(async tx => {
      const [match] = await tx.$queryRaw<{ status: string; mealStatus: string; displayName: string }[]>`
        SELECT m.status, meal.status AS "mealStatus", u."displayName"
        FROM ${databaseTable('Match')} m
        JOIN ${databaseTable('Meal')} meal ON meal.id = m."mealId"
        JOIN ${databaseTable('MatchParticipant')} p ON p."matchId" = m.id
        JOIN ${databaseTable('User')} u ON u.id = p."userId"
        WHERE m.id = ${id} AND p."userId" = ${userId}
      `;
      if (!match) return { status: 404, data: { error: 'チャットが見つかりません。' } };
      if (chatState(match.status, match.mealStatus) !== 'OPEN') return { status: 409, data: { error: 'このチャットは現在利用できません。' } };
      // Serialize sends with completion/cancellation on the same Match row.
      // Serializable retries also re-check Meal state and participant membership.
      await tx.match.update({ where: { id }, data: { updatedAt: new Date() }, select: { id: true } });
      const duplicate = await tx.matchChatMessage.findUnique({ where: { matchId_senderId_clientMessageId: { matchId: id, senderId: userId, clientMessageId } }, select });
      if (duplicate) return { status: 200, data: { message: { ...duplicate, sender: { displayName: match.displayName } } } };
      const recent = await tx.matchChatMessage.findFirst({ where: { matchId: id, senderId: userId, createdAt: { gt: rateLimitSince } }, select: { id: true } });
      if (recent) return { status: 429, data: { error: '連続送信は3秒ほど待ってからお願いします。' } };
      const message = await tx.matchChatMessage.create({ data: { matchId: id, senderId: userId, clientMessageId, body }, select });
      return { status: 201, data: { message: { ...message, sender: { displayName: match.displayName } } } };
    });
    return reply(result.data, result.status);
  } catch (error) {
    console.error('Chat send failed', error instanceof Error ? error.name : 'UnknownError');
    return reply({ error: '送信できませんでした。少し待ってから再試行してください。' }, 503);
  }
}
