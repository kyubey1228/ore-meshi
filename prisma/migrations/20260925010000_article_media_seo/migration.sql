CREATE TYPE "ArticleStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');

ALTER TYPE "GrowthEventType" ADD VALUE 'MEDIA_VIEW';
ALTER TYPE "GrowthEventType" ADD VALUE 'MEDIA_CTA_CLICK';
ALTER TYPE "GrowthEventType" ADD VALUE 'MEDIA_RECRUITMENT_CLICK';
ALTER TYPE "GrowthEventType" ADD VALUE 'SEO_AREA_VIEW';
ALTER TYPE "GrowthEventType" ADD VALUE 'SEO_GENRE_VIEW';
ALTER TYPE "GrowthEventType" ADD VALUE 'SEO_SIGNUP';
ALTER TYPE "GrowthEventType" ADD VALUE 'SEO_RECRUITMENT_CREATE';

CREATE TABLE "ArticleCategory" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "slug" TEXT NOT NULL, "description" TEXT, "seoTitle" TEXT, "seoDescription" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "ArticleCategory_pkey" PRIMARY KEY ("id"));
CREATE TABLE "ArticleTag" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "slug" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "ArticleTag_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Article" ("id" TEXT NOT NULL, "title" TEXT NOT NULL, "slug" TEXT NOT NULL, "excerpt" TEXT, "content" TEXT NOT NULL, "coverImage" TEXT, "coverImageAlt" TEXT, "imageWidth" INTEGER NOT NULL DEFAULT 1200, "imageHeight" INTEGER NOT NULL DEFAULT 630, "status" "ArticleStatus" NOT NULL DEFAULT 'DRAFT', "publishedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, "authorId" TEXT NOT NULL, "categoryId" TEXT, "seoTitle" TEXT, "seoDescription" TEXT, "canonicalUrl" TEXT, "noindex" BOOLEAN NOT NULL DEFAULT false, "ogImage" TEXT, "viewCount" INTEGER NOT NULL DEFAULT 0, "readingTime" INTEGER NOT NULL DEFAULT 1, "featured" BOOLEAN NOT NULL DEFAULT false, "priority" INTEGER NOT NULL DEFAULT 0, "relatedArea" TEXT, "relatedGenre" TEXT, CONSTRAINT "Article_pkey" PRIMARY KEY ("id"));
CREATE TABLE "ArticleTagRelation" ("articleId" TEXT NOT NULL, "tagId" TEXT NOT NULL, CONSTRAINT "ArticleTagRelation_pkey" PRIMARY KEY ("articleId", "tagId"));
CREATE TABLE "ArticleSlugRedirect" ("id" TEXT NOT NULL, "oldSlug" TEXT NOT NULL, "articleId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "ArticleSlugRedirect_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "ArticleCategory_slug_key" ON "ArticleCategory"("slug");
CREATE UNIQUE INDEX "ArticleTag_slug_key" ON "ArticleTag"("slug");
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");
CREATE INDEX "Article_status_publishedAt_idx" ON "Article"("status", "publishedAt");
CREATE INDEX "Article_categoryId_status_publishedAt_idx" ON "Article"("categoryId", "status", "publishedAt");
CREATE INDEX "Article_relatedArea_relatedGenre_status_idx" ON "Article"("relatedArea", "relatedGenre", "status");
CREATE INDEX "ArticleTagRelation_tagId_idx" ON "ArticleTagRelation"("tagId");
CREATE UNIQUE INDEX "ArticleSlugRedirect_oldSlug_key" ON "ArticleSlugRedirect"("oldSlug");
CREATE INDEX "ArticleSlugRedirect_articleId_idx" ON "ArticleSlugRedirect"("articleId");
ALTER TABLE "Article" ADD CONSTRAINT "Article_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Article" ADD CONSTRAINT "Article_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ArticleCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ArticleTagRelation" ADD CONSTRAINT "ArticleTagRelation_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ArticleTagRelation" ADD CONSTRAINT "ArticleTagRelation_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "ArticleTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
