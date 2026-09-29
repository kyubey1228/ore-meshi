import { exchangeMobileAuthorizationCode, mobileAuthExchangeSchema } from '@/server/mobile-auth';
import { mobilePrivateJson, mobilePrivateOptions } from '@/lib/mobile-api';

export async function POST(request: Request) {
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') return mobilePrivateJson({ error: 'JSONが必要です。' }, { status: 415 });
  const parsed = mobileAuthExchangeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return mobilePrivateJson({ error: '認証リクエストが不正です。' }, { status: 400 });
  const result = await exchangeMobileAuthorizationCode(parsed.data.code, parsed.data.codeVerifier);
  if (!result) return mobilePrivateJson({ error: '認証コードが無効または期限切れです。' }, { status: 401 });
  return mobilePrivateJson({ accessToken: result.token, expiresAt: result.expiresAt.toISOString() });
}

export const OPTIONS = mobilePrivateOptions;
