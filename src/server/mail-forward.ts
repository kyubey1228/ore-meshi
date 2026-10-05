import 'server-only';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/server/email';

const MAX_PER_RUN = 20;

function enabled() { return process.env.MAIL_FORWARD_ENABLED === 'true'; }
function required(name: string, fallback?: string) {
  const value = process.env[name]?.trim() || fallback?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}
function escapeHtml(value: string) { return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!); }

export async function forwardInboundMail() {
  if (!enabled()) return { enabled: false, forwarded: 0 };
  const mailbox = 'INBOX';
  const user = required('IMAP_USER', process.env.SMTP_USER);
  const client = new ImapFlow({
    host: required('IMAP_HOST'),
    port: Number(process.env.IMAP_PORT || 993),
    secure: process.env.IMAP_SECURE !== 'false',
    auth: { user, pass: required('IMAP_PASS', process.env.SMTP_PASS) },
    logger: false,
  });
  let forwarded = 0;
  await client.connect();
  try {
    const lock = await client.getMailboxLock(mailbox);
    try {
      let cursor = await prisma.mailForwardCursor.findUnique({ where: { mailbox } });
      if (!cursor) {
        const latestUid = Math.max(Number(client.mailbox && client.mailbox.uidNext || 1) - 1, 0);
        cursor = await prisma.mailForwardCursor.create({ data: { mailbox, lastUid: BigInt(Math.max(latestUid - MAX_PER_RUN, 0)) } });
      }
      const startUid = cursor.lastUid + BigInt(1);
      const latestUid = BigInt(Math.max(Number(client.mailbox && client.mailbox.uidNext || 1) - 1, 0));
      if (startUid > latestUid) return { enabled: true, forwarded };
      for await (const message of client.fetch(`${startUid}:*`, { uid: true, source: true }, { uid: true })) {
        if (!message.uid || !message.source || forwarded >= MAX_PER_RUN) break;
        const parsed = await simpleParser(message.source);
        const sender = parsed.from?.text || '送信者不明';
        const replyTo = parsed.replyTo?.value.map(item => item.address).filter(Boolean).join(', ') || parsed.from?.value.map(item => item.address).filter(Boolean).join(', ') || undefined;
        const subject = parsed.subject || '件名なし';
        const text = `転送元: ${sender}\n受信日時: ${(parsed.date || new Date()).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}\n\n${parsed.text || '本文は添付された元メールをご確認ください。'}`;
        const result = await sendEmail({
          to: required('MAIL_FORWARD_TO'), subject: `Fwd: ${subject}`, replyTo,
          text,
          html: `<p><strong>転送元:</strong> ${escapeHtml(sender)}</p><p><strong>件名:</strong> ${escapeHtml(subject)}</p><pre style="white-space:pre-wrap">${escapeHtml(parsed.text || '本文は添付された元メールをご確認ください。')}</pre>`,
          attachments: [{ filename: 'original-message.eml', content: message.source, contentType: 'message/rfc822' }],
        });
        if (!result.ok) throw new Error(`Mail forward failed: ${result.error}`);
        await prisma.mailForwardCursor.update({ where: { mailbox }, data: { lastUid: BigInt(message.uid) } });
        forwarded += 1;
      }
      return { enabled: true, forwarded };
    } finally { lock.release(); }
  } finally { await client.logout().catch(() => undefined); }
}
