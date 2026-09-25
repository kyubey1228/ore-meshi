'use server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { perform, ensure } from '@/server/action';
import { requireAdmin } from '@/server/admin';
import { readingTime, validPublicUrl } from '@/lib/media';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const inputSchema = z.object({
  id: z.string().optional(), title: z.string().trim().min(3).max(160),
  slug: z.string().trim().min(3).max(120).regex(slugPattern, 'slugは半角英小文字・数字・ハイフンで入力してください。'),
  excerpt: z.string().trim().max(300).optional(), content: z.string().trim().min(20),
  status: z.enum(['DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED']), publishedAt: z.string().optional(),
  categoryName: z.string().trim().max(80).optional(), categorySlug: z.string().trim().max(80).optional(),
  tags: z.string().max(500).optional(), seoTitle: z.string().trim().max(70).optional(), seoDescription: z.string().trim().max(180).optional(),
  canonicalUrl: z.string().trim().max(500).optional(), coverImage: z.string().trim().max(1000).optional(), coverImageAlt: z.string().trim().max(160).optional(),
  ogImage: z.string().trim().max(1000).optional(), relatedArea: z.string().trim().max(80).optional(), relatedGenre: z.string().trim().max(80).optional(),
  imageWidth: z.coerce.number().int().min(200).max(4000).default(1200), imageHeight: z.coerce.number().int().min(200).max(4000).default(630),
  priority: z.coerce.number().int().min(0).max(100).default(0), noindex: z.boolean().default(false), featured: z.boolean().default(false),
});

function text(form: FormData, key: string) { const value = form.get(key); return typeof value === 'string' ? value : undefined; }

export async function saveArticle(form: FormData) { return perform(async userId => {
  await requireAdmin();
  const parsed = inputSchema.parse({ ...Object.fromEntries(form), noindex: form.get('noindex') === 'on', featured: form.get('featured') === 'on' });
  if (parsed.status === 'SCHEDULED') ensure(parsed.publishedAt && new Date(parsed.publishedAt) > new Date(), '予約公開日時は未来を指定してください。');
  for (const [label, value] of [['アイキャッチ', parsed.coverImage], ['OG画像', parsed.ogImage], ['canonical', parsed.canonicalUrl]] as const) ensure(!value || validPublicUrl(value), `${label}はHTTPS URLで入力してください。`);
  ensure(!parsed.coverImage || parsed.coverImageAlt, 'アイキャッチ画像にはaltを入力してください。');
  const category = parsed.categoryName && parsed.categorySlug ? await prisma.articleCategory.upsert({ where: { slug: parsed.categorySlug }, update: { name: parsed.categoryName }, create: { name: parsed.categoryName, slug: parsed.categorySlug } }) : null;
  const tagNames = (parsed.tags ?? '').split(',').map(v => v.trim()).filter(Boolean).slice(0, 12);
  const tags = await Promise.all(tagNames.map(async name => {
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff-]/g, '').slice(0, 80);
    return prisma.articleTag.upsert({ where: { slug }, update: { name }, create: { name, slug } });
  }));
  const publication = parsed.status === 'PUBLISHED' ? (parsed.publishedAt ? new Date(parsed.publishedAt) : new Date()) : parsed.publishedAt ? new Date(parsed.publishedAt) : null;
  const data = { title: parsed.title, slug: parsed.slug, excerpt: parsed.excerpt || null, content: parsed.content, status: parsed.status, publishedAt: publication, categoryId: category?.id ?? null, seoTitle: parsed.seoTitle || null, seoDescription: parsed.seoDescription || null, canonicalUrl: parsed.canonicalUrl || null, coverImage: parsed.coverImage || null, coverImageAlt: parsed.coverImageAlt || null, ogImage: parsed.ogImage || null, relatedArea: parsed.relatedArea || null, relatedGenre: parsed.relatedGenre || null, imageWidth: parsed.imageWidth, imageHeight: parsed.imageHeight, priority: parsed.priority, noindex: parsed.noindex, featured: parsed.featured, readingTime: readingTime(parsed.content), tags: { create: tags.map(tag => ({ tagId: tag.id })) } };
  if (parsed.id) {
    const old = await prisma.article.findUnique({ where: { id: parsed.id }, select: { slug: true } }); ensure(old, '記事が見つかりません。');
    await prisma.$transaction(async tx => { await tx.articleTagRelation.deleteMany({ where: { articleId: parsed.id } }); await tx.article.update({ where: { id: parsed.id }, data }); if (old.slug !== parsed.slug) await tx.articleSlugRedirect.upsert({ where: { oldSlug: old.slug }, update: { articleId: parsed.id! }, create: { oldSlug: old.slug, articleId: parsed.id! } }); });
  } else await prisma.article.create({ data: { ...data, authorId: userId } });
  return '/admin/media';
}); }

export async function deleteArticle(form: FormData) { return perform(async () => { await requireAdmin(); const id = z.string().min(1).parse(text(form, 'id')); await prisma.article.delete({ where: { id } }); return '/admin/media'; }); }
