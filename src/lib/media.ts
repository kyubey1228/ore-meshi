import { appUrl, truncate } from '@/lib/social';

export const ARTICLE_PAGE_SIZE = 12;

export function isPublishedArticle(now = new Date()) {
  return { status: 'PUBLISHED' as const, publishedAt: { lte: now } };
}

export function articleDescription(article: { seoDescription?: string | null; excerpt?: string | null; content: string }) {
  const plain = article.content
    .replace(/<[^>]+>/g, ' ')
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
  return Math.max(1, Math.ceil(content.replace(/<[^>]+>/g, '').replace(/\s/g, '').length / 600));
}

// Tiptapが出力する本文は必ずブロック要素(<p>など)から始まるため、先頭が'<'かどうかで
// 新形式(HTML)か旧形式(独自Markdown)かを判定できる。
export function isHtmlContent(content: string) {
  return /^\s*</.test(content);
}

function stripTags(html: string) {
  return html.replace(/<[^>]+>/g, '').trim();
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
  if (isHtmlContent(content)) {
    return [...content.matchAll(/<h([23])(?:\s[^>]*)?>([\s\S]*?)<\/h\1>/gi)].map((match, index) => {
      const text = stripTags(match[2]);
      return { level: Number(match[1]), text, id: headingId(text, index) };
    });
  }
  return content.split('\n').flatMap((line, index) => {
    const match = /^(##|###)\s+(.+)$/.exec(line.trim());
    return match ? [{ level: match[1].length, text: match[2].replace(/[*_`]/g, '').trim(), id: headingId(match[2], index) }] : [];
  });
}

// extractHeadings(HTML分岐)と同じ順番・同じheadingId()呼び出しで見出しにidを振るため、
// 目次のリンク先(#id)と実際の見出しのidが一致する。
export function injectHeadingIds(html: string) {
  let index = 0;
  return html.replace(/<h([23])((?:\s[^>]*)?)>([\s\S]*?)<\/h\1>/gi, (_full, level, attrs, inner) => {
    const id = headingId(stripTags(inner), index++);
    return `<h${level} id="${id}"${attrs}>${inner}</h${level}>`;
  });
}
