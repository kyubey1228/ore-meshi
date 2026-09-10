import 'server-only';
import nodemailer from 'nodemailer';

// SMTP環境変数が未設定の場合はメール送信自体をno-opにする(ローカル/未設定環境でのエラーを避ける)。
// どのSMTPプロバイダでも(Gmail Workspace/SendGrid/AWS SES等のSMTPリレー含め)差し替えられる最小構成。
function transport() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
}

export function emailEnabled() {
  return Boolean(process.env.SMTP_HOST);
}

export async function sendEmail(input: { to: string; subject: string; html: string; text: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  const t = transport();
  if (!t) return { ok: false, error: 'SMTP_HOST未設定のため送信をスキップしました。' };
  try {
    await t.sendMail({ from: process.env.SMTP_FROM ?? '"俺は誰かと飯が食いたい！" <no-reply@ore-meshi.app>', to: input.to, subject: input.subject, html: input.html, text: input.text });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'unknown error' };
  }
}
