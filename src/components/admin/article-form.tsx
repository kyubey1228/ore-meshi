import type { Article, ArticleCategory, ArticleTagRelation, ArticleTag } from '@prisma/client';
import { ActionForm } from '@/components/action-form';
import { saveArticle } from '@/server/actions/media';
import { MediaImageUploader } from '@/components/admin/media-image-uploader';
import { ArticleContentEditor } from '@/components/admin/article-content-editor';

type Editable = Article & { category: ArticleCategory | null; tags: (ArticleTagRelation & { tag: ArticleTag })[] };
export function ArticleForm({ article }: { article?: Editable | null }) {
  const localDate = article?.publishedAt ? new Date(article.publishedAt.getTime() - article.publishedAt.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
  return <ActionForm action={saveArticle} label={article ? '記事を更新' : '記事を保存'}>
    {article && <input type="hidden" name="id" value={article.id} />}
    <div className="form-grid">
      <label>タイトル<input name="title" required minLength={3} maxLength={160} defaultValue={article?.title} /></label>
      <label>slug<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="how-to-find-dinner-friends" defaultValue={article?.slug} /></label>
      <label>状態<select name="status" defaultValue={article?.status ?? 'DRAFT'}><option value="DRAFT">下書き</option><option value="SCHEDULED">予約公開</option><option value="PUBLISHED">公開</option><option value="ARCHIVED">非公開・保管</option></select></label>
      <label>公開日時<input type="datetime-local" name="publishedAt" defaultValue={localDate} /></label>
      <label>カテゴリ名<input name="categoryName" placeholder="食事相手" defaultValue={article?.category?.name ?? ''} /></label>
      <label>カテゴリslug<input name="categorySlug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="dinner-partners" defaultValue={article?.category?.slug ?? ''} /></label>
      <label>タグ（カンマ区切り）<input name="tags" defaultValue={article?.tags.map(item => item.tag.name).join(', ')} /></label>
      <label>関連エリア<input name="relatedArea" defaultValue={article?.relatedArea ?? ''} /></label>
      <label>関連ジャンル<input name="relatedGenre" defaultValue={article?.relatedGenre ?? ''} /></label>
      <label>優先度<input type="number" min="0" max="100" name="priority" defaultValue={article?.priority ?? 0} /></label>
    </div>
    <label>概要<textarea name="excerpt" maxLength={300} rows={3} defaultValue={article?.excerpt ?? ''} /></label>
    <label>本文（Markdown）<ArticleContentEditor defaultValue={article?.content ?? ''} /></label>
    <div className="form-grid">
      <label>SEO title<input name="seoTitle" maxLength={70} defaultValue={article?.seoTitle ?? ''} /></label>
      <label>SEO description<input name="seoDescription" maxLength={180} defaultValue={article?.seoDescription ?? ''} /></label>
      <label>canonical URL<input type="url" name="canonicalUrl" defaultValue={article?.canonicalUrl ?? ''} /></label>
      <label>画像alt<input name="coverImageAlt" maxLength={160} defaultValue={article?.coverImageAlt ?? ''} /></label>
    </div>
    <div className="form-grid"><MediaImageUploader name="coverImage" label="アイキャッチ画像" purpose="cover" defaultValue={article?.coverImage ?? ''} includeDimensions defaultWidth={article?.imageWidth ?? 1200} defaultHeight={article?.imageHeight ?? 630}/><MediaImageUploader name="ogImage" label="OG画像" purpose="og" defaultValue={article?.ogImage ?? ''}/></div>
    <div className="row wrap"><label className="check-label"><input type="checkbox" name="featured" defaultChecked={article?.featured} /> おすすめ</label><label className="check-label"><input type="checkbox" name="noindex" defaultChecked={article?.noindex} /> noindex</label></div>
  </ActionForm>;
}
