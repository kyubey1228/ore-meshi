import { z } from 'zod';
export const chatInputSchema = z.object({ body: z.string().trim().min(1).max(1000), clientMessageId: z.uuid() });
export type ChatState = 'OPEN' | 'WAITING' | 'CLOSED';
export function chatState(matchStatus: string, mealStatus: string): ChatState {
  if (matchStatus !== 'ACTIVE' || !['OPEN', 'MATCHED'].includes(mealStatus)) return 'CLOSED';
  return mealStatus === 'MATCHED' ? 'OPEN' : 'WAITING';
}
export type ChatMessage = { id: string; senderId: string; body: string; createdAt: string; sender: { displayName: string } };
export type ChatData = { state: ChatState; messages: ChatMessage[] };
