import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { gcsObjectName, gcsUploadRequestSchema, MAX_GCS_UPLOAD_BYTES } from '@/lib/gcs-upload';
import { isAllowedBrowserOrigin } from '@/lib/security';
import { requireAdmin } from '@/server/admin';
import { UserError } from '@/server/action';
import { GCS_BUCKET_NAME, gcsStorage, publicGcsUrl } from '@/server/gcs';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    if (!isAllowedBrowserOrigin(request)) return NextResponse.json({ ok: false, message: '許可されていない送信元です。' }, { status: 403 });
    await requireAdmin();
    const declaredSize = Number(request.headers.get('content-length') || 0);
    if (declaredSize > MAX_GCS_UPLOAD_BYTES) return NextResponse.json({ ok: false, message: '画像は8MB以下にしてください。' }, { status: 413 });

    const purpose = new URL(request.url).searchParams.get('purpose');
    const body = Buffer.from(await request.arrayBuffer());
    const input = gcsUploadRequestSchema.parse({ contentType: request.headers.get('content-type'), size: body.byteLength, purpose });
    const objectName = gcsObjectName(input.purpose, randomUUID());
    await gcsStorage().bucket(GCS_BUCKET_NAME).file(objectName).save(body, {
      resumable: false,
      validation: 'crc32c',
      metadata: { contentType: input.contentType, cacheControl: 'public, max-age=31536000, immutable' },
    });
    return NextResponse.json({ ok: true, publicUrl: publicGcsUrl(objectName) });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'UnknownError';
    console.error('GCS server upload failed', detail);
    if (error instanceof UserError) return NextResponse.json({ ok: false, message: '管理者ログインが必要です。' }, { status: 401 });
    if (error && typeof error === 'object' && 'issues' in error) return NextResponse.json({ ok: false, message: '画像の形式または容量が不正です。' }, { status: 400 });
    if (detail.startsWith('GCS_CONFIG_MISSING:')) return NextResponse.json({ ok: false, message: '本番環境のGCS認証設定が読み込まれていません。' }, { status: 503 });
    return NextResponse.json({ ok: false, message: '画像を保存できませんでした。GCSの書き込み権限を確認してください。' }, { status: 503 });
  }
}
