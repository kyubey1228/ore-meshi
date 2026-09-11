export type EmailTemplate = {
  subject: string;
  text: string;
  html: string;
};

export type EmailTemplateInput = {
  subject: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
};

const BRAND = '俺は誰かと飯が食いたい！';

export function escapeEmailHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] as string);
}

export function buildEmailTemplate(input: EmailTemplateInput): EmailTemplate {
  const safeSubject = input.subject.trim();
  const paragraphs = input.body.split(/\n{2,}/).map(part => part.trim()).filter(Boolean);
  const text = [input.body.trim(), `${input.ctaLabel}: ${input.ctaUrl}`, '', `${BRAND}`, 'このメールは送信専用です。返信いただいても確認できません。'].join('\n\n');
  const content = paragraphs.map(paragraph => `<p style="margin:0 0 16px;line-height:1.75;color:#292524">${escapeEmailHtml(paragraph).replace(/\n/g, '<br>')}</p>`).join('');
  const html = `<!doctype html><html lang="ja"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#fafaf9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"><div style="max-width:560px;margin:0 auto;padding:24px 16px"><div style="background:#fff;border:1px solid #e7e5e4;border-radius:16px;padding:28px 22px"><div style="font-size:14px;font-weight:700;color:#ea580c;margin-bottom:24px">${BRAND}</div>${content}<p style="margin:26px 0"><a href="${escapeEmailHtml(input.ctaUrl)}" style="display:inline-block;background:#ea580c;color:#fff;text-decoration:none;font-weight:700;padding:13px 20px;border-radius:10px">${escapeEmailHtml(input.ctaLabel)}</a></p><p style="margin:28px 0 0;padding-top:18px;border-top:1px solid #e7e5e4;color:#78716c;font-size:12px;line-height:1.6">このメールは送信専用です。返信いただいても確認できません。</p></div></div></body></html>`;
  return { subject: safeSubject, text, html };
}

export function emailEventKey(notificationType: string, entityId: string, recipientId: string, suffix?: string) {
  return [notificationType.toLowerCase().replaceAll('_', '-'), entityId, recipientId, suffix].filter(Boolean).join(':');
}

export function notificationCta(notificationType: string) {
  if (notificationType === 'JOIN_REQUEST_RECEIVED') return '参加希望を確認する';
  if (notificationType === 'JOIN_REQUEST_REJECTED') return 'ほかの募集を見る';
  if (notificationType === 'DINING_FEEDBACK_REQUEST') return '感想を送る';
  if (notificationType === 'RECRUITMENT_NO_APPLICATIONS') return '募集を確認する';
  if (notificationType.startsWith('BUSINESS_')) return '管理画面で確認する';
  if (notificationType === 'DEMAND_MATCH_FOUND') return '募集を見る';
  return '予定を確認する';
}
