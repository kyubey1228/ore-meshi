import { readFile } from 'node:fs/promises';
import { Storage } from '@google-cloud/storage';

// src/server/gcs.tsは'server-only'をimportしておりNextのビルド機構下でのみ解決できるため、
// migrate-static-images-to-gcs.tsと同様、このスクリプトは同等のロジックをここに複製している。
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

async function main() {
  const cors = JSON.parse(await readFile('cors-config.json', 'utf8'));
  const bucket = gcsStorage().bucket(GCS_BUCKET_NAME);
  await bucket.setCorsConfiguration(cors);
  const [metadata] = await bucket.getMetadata();
  console.log('Applied CORS:', JSON.stringify(metadata.cors, null, 2));
}

main().catch(error => { console.error(error); process.exitCode = 1; });
