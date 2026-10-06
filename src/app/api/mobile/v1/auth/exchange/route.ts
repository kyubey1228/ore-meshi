import { exchangeMobileAuthorizationCode, mobileAuthExchangeSchema } from '@/server/mobile-auth';
import { mobilePrivateJson, mobilePrivateOptions } from '@/lib/mobile-api';
import { checkRateLimit, readJsonWithLimit } from '@/lib/security';

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request, 'mobile-auth-exchange', 30);
  if (!rateLimit.allowed) return mobilePrivateJson({ error: '試行回数が多すぎます。しばらく待ってから再度お試しください。' }, { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } });
  let body: unknown;
  try { body = await readJsonWithLimit(request, 4 * 1024); }
  catch (error) { return mobilePrivateJson({ error: '認証リクエストが不正です。' }, { status: error instanceof Response ? error.status : 400 }); }
  const parsed = mobileAuthExchangeSchema.safeParse(body);
  if (!parsed.success) return mobilePrivateJson({ error: '認証リクエストが不正です。' }, { status: 400 });
  const result = await exchangeMobileAuthorizationCode(parsed.data.code, parsed.data.codeVerifier);
  if (!result) return mobilePrivateJson({ error: '認証コードが無効または期限切れです。' }, { status: 401 });
  return mobilePrivateJson({ accessToken: result.token, expiresAt: result.expiresAt.toISOString() });
}

export const OPTIONS = mobilePrivateOptions;
