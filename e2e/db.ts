import { PrismaClient } from '@prisma/client';

// global-setup.ts と同じ検証済みE2E_DATABASE_URLを使う共有クライアント。
// 個別のspecファイルがテスト用の状態(過去日時への書き換え・締切切れ等)を直接作るために使う。
export const db = new PrismaClient({ datasources: { db: { url: process.env.E2E_DATABASE_URL } } });
