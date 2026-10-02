import 'server-only';
import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = ['p', 'h2', 'h3', 'h4', 'strong', 'em', 's', 'u', 'a', 'ul', 'ol', 'li', 'blockquote', 'img', 'hr', 'br', 'code', 'pre'];

export function sanitizeArticleHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { a: ['href', 'target', 'rel'], img: ['src', 'alt', 'width', 'height', 'data-image-size'] },
    allowedSchemes: ['https', 'http'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }),
      img: (tagName, attribs) => {
        const { 'data-image-size': requestedSize, ...safeAttribs } = attribs;
        const size = ['small', 'medium', 'large', 'full'].includes(requestedSize) ? requestedSize : undefined;
        return { tagName, attribs: { ...safeAttribs, ...(size ? { 'data-image-size': size } : {}) } };
      },
    },
  });
}
