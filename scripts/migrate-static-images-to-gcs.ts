import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Storage } from '@google-cloud/storage';

// src/server/gcs.tsは'server-only'をimportしておりNextのビルド機構下でのみ解決できるため、
// このスクリプトはtsxから直接実行できるよう同等のロジックをここに複製している。
const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'ore-meshi';
function gcsStorage() {
  const clientEmail = process.env.GCS_CLIENT_EMAIL?.trim();
  const privateKey = process.env.GCS_PRIVATE_KEY?.replace(/\\n/g, '\n').trim();
  const explicit = clientEmail && privateKey ? { client_email: clientEmail, private_key: privateKey } : undefined;
  const projectId = process.env.GCS_PROJECT_ID?.trim() || explicit?.client_email.split('@')[1]?.replace(/\.iam\.gserviceaccount\.com$/, '');
  if (!projectId) throw new Error('GCS_PROJECT_ID is not configured');
  if (!explicit && !process.env.GOOGLE_APPLICATION_CREDENTIALS) throw new Error('GCS service account credentials are not configured');
  return new Storage({ projectId, ...(explicit ? { credentials: explicit } : {}) });
}
function publicGcsUrl(objectName: string) {
  return `https://storage.googleapis.com/${encodeURIComponent(GCS_BUCKET_NAME)}/${objectName.split('/').map(encodeURIComponent).join('/')}`;
}

const CONTENT_TYPES: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

// public/配下に同梱していた画像をGCSへ移す。左側がpublic/からの相対パス、右側がGCS上のobject名。
const FILES: [string, string][] = [
  ['ugc/gag-callout-v2.jpg', 'static/ugc/gag-callout-v2.jpg'],
  ['ugc/deadpan-wait-v2.jpg', 'static/ugc/deadpan-wait-v2.jpg'],
  ['ugc/victory-feast-v2.jpg', 'static/ugc/victory-feast-v2.jpg'],
  ['ugc/woman-callout-v2.jpg', 'static/ugc/woman-callout-v2.jpg'],
  ['ugc/mixer-night-v2.jpg', 'static/ugc/mixer-night-v2.jpg'],
  ['ugc/women-only-v2.jpg', 'static/ugc/women-only-v2.jpg'],
  ['ugc/men-only-v2.jpg', 'static/ugc/men-only-v2.jpg'],
  ['business/hero/izakaya-interior.jpg', 'static/business/hero/izakaya-interior.jpg'],
];

async function main() {
  const bucket = gcsStorage().bucket(GCS_BUCKET_NAME);
  for (const [source, objectName] of FILES) {
    const bytes = await readFile(path.join(process.cwd(), 'public', source));
    const contentType = CONTENT_TYPES[path.extname(source).toLowerCase()] ?? 'application/octet-stream';
    await bucket.file(objectName).save(bytes, { contentType, resumable: false });
    console.log(`${source} -> ${publicGcsUrl(objectName)}`);
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
