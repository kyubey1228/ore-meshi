import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { headingId, injectHeadingIds, isHtmlContent, validPublicUrl } from '@/lib/media';
import { sanitizeArticleHtml } from '@/lib/sanitize-article-html';

function inline(text: string): ReactNode[] {
  const pattern = /(!?\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*)/g;
  return text.split(pattern).filter(Boolean).map((part, index) => {
    const image = /^!\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (image) {
      const src = validPublicUrl(image[2]);
      return src ? <Image key={index} src={src} alt={image[1]} width={960} height={540} unoptimized /> : null;
    }
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link) {
      const href = link[2].startsWith('/') ? link[2] : validPublicUrl(link[2]);
      return href ? <Link key={index} href={href}>{link[1]}</Link> : link[1];
    }
    const bold = /^\*\*([^*]+)\*\*$/.exec(part);
    return bold ? <strong key={index}>{bold[1]}</strong> : part;
  });
}

export function MarkdownContent({ content }: { content: string }) {
  const lines = content.replace(/\r/g, '').split('\n');
  const nodes: ReactNode[] = [];
  for (let i = 0; i < lines.length;) {
    const value = lines[i].trim();
    if (!value) { i++; continue; }
    const heading = /^(##|###)\s+(.+)$/.exec(value);
    if (heading) {
      const id = headingId(heading[2], i);
      nodes.push(heading[1].length === 2 ? <h2 id={id} key={i}>{inline(heading[2])}</h2> : <h3 id={id} key={i}>{inline(heading[2])}</h3>);
      i++; continue;
    }
    if (/^>\s?/.test(value)) { nodes.push(<blockquote key={i}>{inline(value.replace(/^>\s?/, ''))}</blockquote>); i++; continue; }
    if (/^[-*]\s+/.test(value)) {
      const items: string[] = []; const start = i;
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) items.push(lines[i++].trim().replace(/^[-*]\s+/, ''));
      nodes.push(<ul key={start}>{items.map((item, n) => <li key={n}>{inline(item)}</li>)}</ul>); continue;
    }
    if (/^\d+\.\s+/.test(value)) {
      const items: string[] = []; const start = i;
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) items.push(lines[i++].trim().replace(/^\d+\.\s+/, ''));
      nodes.push(<ol key={start}>{items.map((item, n) => <li key={n}>{inline(item)}</li>)}</ol>); continue;
    }
    if (value.includes('|') && lines[i + 1]?.trim().match(/^\|?\s*:?-+/)) {
      const rows: string[][] = []; const start = i;
      rows.push(value.replace(/^\||\|$/g, '').split('|').map(v => v.trim())); i += 2;
      while (i < lines.length && lines[i].includes('|')) rows.push(lines[i++].trim().replace(/^\||\|$/g, '').split('|').map(v => v.trim()));
      nodes.push(<div className="comparison-scroll" key={start}><table><thead><tr>{rows[0].map((cell, n) => <th key={n}>{inline(cell)}</th>)}</tr></thead><tbody>{rows.slice(1).map((row, r) => <tr key={r}>{row.map((cell, n) => <td key={n}>{inline(cell)}</td>)}</tr>)}</tbody></table></div>); continue;
    }
    const paragraphs = [value]; const start = i++;
    while (i < lines.length && lines[i].trim() && !/^(##|###|>|[-*]\s|\d+\.\s)/.test(lines[i].trim())) paragraphs.push(lines[i++].trim());
    nodes.push(<p key={start}>{inline(paragraphs.join(' '))}</p>);
  }
  return <div className="media-body">{nodes}</div>;
}

// 記事編集画面がWYSIWYG(Tiptap)化されて以降、新しい記事はHTMLで保存される。
// 旧エディタ時代の独自Markdown記事も引き続き表示できるよう、フォーマットを自動判定する。
export function ArticleBody({ content }: { content: string }) {
  if (isHtmlContent(content)) {
    const safeHtml = injectHeadingIds(sanitizeArticleHtml(content));
    return <div className="media-body" dangerouslySetInnerHTML={{ __html: safeHtml }} />;
  }
  return <MarkdownContent content={content} />;
}
