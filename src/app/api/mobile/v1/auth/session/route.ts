import { getMobileSession, revokeMobileSession } from '@/server/mobile-auth';
import { mobilePrivateJson, mobilePrivateOptions } from '@/lib/mobile-api';

export async function GET(request: Request) {
  const auth = await getMobileSession(request);
  if (!auth) return mobilePrivateJson({ error: 'ログインが必要です。' }, { status: 401 });
  return mobilePrivateJson({ user: auth.user, expiresAt: auth.session.expiresAt.toISOString() });
}

export async function DELETE(request: Request) {
  await revokeMobileSession(request);
  return mobilePrivateJson({ ok: true });
}

export const OPTIONS = mobilePrivateOptions;
