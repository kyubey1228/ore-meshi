import { z } from 'zod';

export const MAX_GCS_UPLOAD_BYTES = 8 * 1024 * 1024;
export const gcsUploadRequestSchema = z.object({
  contentType: z.literal('image/webp'),
  size: z.number().int().positive().max(MAX_GCS_UPLOAD_BYTES),
  purpose: z.enum(['cover', 'og', 'body']),
});

export function resolveGcsProjectId(explicitProjectId: string | undefined, clientEmail: string | undefined) {
  const explicit = explicitProjectId?.trim();
  if (explicit) return explicit;
  const domain = clientEmail?.trim().split('@')[1];
  return domain?.endsWith('.iam.gserviceaccount.com') ? domain.slice(0, -'.iam.gserviceaccount.com'.length) : undefined;
}

export function gcsObjectName(purpose: 'cover' | 'og' | 'body', id: string, now = new Date()) {
  return `articles/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${purpose}-${id}.webp`;
}

export function gcsPublicUrl(bucketName: string, objectName: string) {
  return `https://storage.googleapis.com/${encodeURIComponent(bucketName)}/${objectName.split('/').map(encodeURIComponent).join('/')}`;
}
