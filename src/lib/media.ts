import { appUrl, truncate } from '@/lib/social';

export const ARTICLE_PAGE_SIZE = 12;

export function isPublishedArticle(now = new Date()) {
  return { status: 'PUBLISHED' as const, publishedAt: { lte: now } };
}

export function articleDescription(article: { seoDescription?: string | null; excerpt?: string | null; content: string }) {
  const plain = article.content
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`|~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return truncate(article.seoDescription?.trim() || article.excerpt?.trim() || plain, 150);
}

export function articleCanonical(slug: string, override?: string | null) {
  return override?.trim() || `${appUrl()}/media/${encodeURIComponent(slug)}`;
}

export function readingTime(content: string) {
  return Math.max(1, Math.ceil(content.replace(/\s/g, '').length / 600));
}

export function validPublicUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || (process.env.NODE_ENV !== 'production' && url.protocol === 'http:') ? url.toString() : null;
  } catch { return null; }
}

export function headingId(text: string, index: number) {
  const normalized = text.toLowerCase().replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/g, '-').replace(/^-|-$/g, '');
  return normalized || `section-${index + 1}`;
}

export function extractHeadings(content: string) {
  return content.split('\n').flatMap((line, index) => {
    const match = /^(##|###)\s+(.+)$/.exec(line.trim());
    return match ? [{ level: match[1].length, text: match[2].replace(/[*_`]/g, '').trim(), id: headingId(match[2], index) }] : [];
  });
}
