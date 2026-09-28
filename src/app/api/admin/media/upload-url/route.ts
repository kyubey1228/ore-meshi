import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { appUrl } from '@/lib/social';
import { gcsObjectName, gcsUploadRequestSchema } from '@/lib/gcs-upload';
import { requireAdmin } from '@/server/admin';
import { GCS_BUCKET_NAME, gcsStorage, publicGcsUrl } from '@/server/gcs';

export const runtime = 'nodejs';

function allowedOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return process.env.NODE_ENV !== 'production';
  return origin === appUrl() || origin === 'http://localhost:3000';
}

export async function POST(request: Request) {
  try {
    if (!allowedOrigin(request)) return NextResponse.json({ ok: false, message: '許可されていない送信元です。' }, { status: 403 });
    await requireAdmin();
    const input = gcsUploadRequestSchema.parse(await request.json());
    const objectName = gcsObjectName(input.purpose, randomUUID());
    const file = gcsStorage().bucket(GCS_BUCKET_NAME).file(objectName);
    const [uploadUrl] = await file.getSignedUrl({ version: 'v4', action: 'write', expires: Date.now() + 5 * 60 * 1000, contentType: input.contentType });
    return NextResponse.json({ ok: true, uploadUrl, publicUrl: publicGcsUrl(objectName), expiresIn: 300 });
  } catch (error) {
    console.error('GCS signed upload URL failed', error instanceof Error ? error.message : 'UnknownError');
    if (error && typeof error === 'object' && 'issues' in error) return NextResponse.json({ ok: false, message: '画像の形式または容量が不正です。' }, { status: 400 });
    return NextResponse.json({ ok: false, message: '画像アップロードを準備できませんでした。' }, { status: 401 });
  }
}
