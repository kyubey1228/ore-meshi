import 'server-only';
import { Storage } from '@google-cloud/storage';

export const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'ore-meshi';

function credentials() {
  const clientEmail = process.env.GCS_CLIENT_EMAIL?.trim();
  const privateKey = process.env.GCS_PRIVATE_KEY?.replace(/\\n/g, '\n').trim();
  if (!clientEmail || !privateKey) return undefined;
  return { client_email: clientEmail, private_key: privateKey };
}

export function gcsStorage() {
  const explicit = credentials();
  const projectId = process.env.GCS_PROJECT_ID?.trim() || explicit?.client_email.split('@')[1]?.replace(/\.iam\.gserviceaccount\.com$/, '');
  if (!projectId) throw new Error('GCS_PROJECT_ID is not configured');
  if (!explicit && !process.env.GOOGLE_APPLICATION_CREDENTIALS) throw new Error('GCS service account credentials are not configured');
  return new Storage({ projectId, ...(explicit ? { credentials: explicit } : {}) });
}

export function publicGcsUrl(objectName: string) {
  return `https://storage.googleapis.com/${encodeURIComponent(GCS_BUCKET_NAME)}/${objectName.split('/').map(encodeURIComponent).join('/')}`;
}
