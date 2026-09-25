import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { appUrl } from '@/lib/social';
import { requireAdmin } from '@/server/admin';
import { GCS_BUCKET_NAME, gcsStorage, publicGcsUrl } from '@/server/gcs';

export const runtime = 'nodejs';
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const schema = z.object({ contentType: z.literal('image/webp'), size: z.number().int().positive().max(MAX_UPLOAD_BYTES), purpose: z.enum(['cover', 'og', 'body']) });

function allowedOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return process.env.NODE_ENV !== 'production';
  return origin === appUrl() || origin === 'http://localhost:3000';
}

export async function POST(request: Request) {
  try {
    if (!allowedOrigin(request)) return NextResponse.json({ ok: false, message: '許可されていない送信元です。' }, { status: 403 });
    await requireAdmin();
    const input = schema.parse(await request.json());
    const now = new Date();
    const objectName = `articles/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${input.purpose}-${randomUUID()}.webp`;
    const file = gcsStorage().bucket(GCS_BUCKET_NAME).file(objectName);
    const [uploadUrl] = await file.getSignedUrl({ version: 'v4', action: 'write', expires: Date.now() + 5 * 60 * 1000, contentType: input.contentType });
    return NextResponse.json({ ok: true, uploadUrl, publicUrl: publicGcsUrl(objectName), expiresIn: 300 });
  } catch (error) {
    console.error('GCS signed upload URL failed', error instanceof Error ? error.message : 'UnknownError');
    if (error instanceof z.ZodError) return NextResponse.json({ ok: false, message: '画像の形式または容量が不正です。' }, { status: 400 });
    return NextResponse.json({ ok: false, message: '画像アップロードを準備できませんでした。' }, { status: 401 });
  }
}
