import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { appUrl } from '@/lib/social';
import { gcsObjectName, gcsUploadRequestSchema } from '@/lib/gcs-upload';
import { requireAdmin } from '@/server/admin';
import { UserError } from '@/server/action';
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
    const detail = error instanceof Error ? error.message : 'UnknownError';
    console.error('GCS signed upload URL failed', detail);
    if (error instanceof UserError) return NextResponse.json({ ok: false, code: 'UNAUTHORIZED', message: '管理者ログインが必要です。' }, { status: 401 });
    if (error && typeof error === 'object' && 'issues' in error) return NextResponse.json({ ok: false, message: '画像の形式または容量が不正です。' }, { status: 400 });
    if (detail.startsWith('GCS_CONFIG_MISSING:')) return NextResponse.json({ ok: false, code: 'GCS_CONFIG_MISSING', message: '本番環境のGCS認証設定が読み込まれていません。' }, { status: 503 });
    if (/DECODER|PEM|private key|unsupported/i.test(detail)) return NextResponse.json({ ok: false, code: 'GCS_PRIVATE_KEY_INVALID', message: 'GCS_PRIVATE_KEYの形式を確認してください。引用符なしのPEMまたは\\n形式で登録できます。' }, { status: 503 });
    return NextResponse.json({ ok: false, code: 'GCS_SIGNING_FAILED', message: 'GCS署名URLを生成できませんでした。サービスアカウント設定を確認してください。' }, { status: 503 });
  }
}
