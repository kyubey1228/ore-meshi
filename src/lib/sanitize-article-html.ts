import 'server-only';
import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = ['p', 'h2', 'h3', 'h4', 'strong', 'em', 's', 'u', 'a', 'ul', 'ol', 'li', 'blockquote', 'img', 'hr', 'br', 'code', 'pre'];

export function sanitizeArticleHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { a: ['href', 'target', 'rel'], img: ['src', 'alt', 'width', 'height'] },
    allowedSchemes: ['https', 'http'],
    transformTags: { a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }) },
  });
}
