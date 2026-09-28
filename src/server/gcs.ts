import 'server-only';
import { Storage } from '@google-cloud/storage';
import { gcsPublicUrl, normalizeGcsPrivateKey, resolveGcsProjectId } from '@/lib/gcs-upload';

export const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'ore-meshi';

function credentials() {
  const clientEmail = process.env.GCS_CLIENT_EMAIL?.trim();
  const privateKey = normalizeGcsPrivateKey(process.env.GCS_PRIVATE_KEY);
  if (!clientEmail || !privateKey) return undefined;
  return { client_email: clientEmail, private_key: privateKey };
}

export function gcsStorage() {
  const explicit = credentials();
  const projectId = resolveGcsProjectId(process.env.GCS_PROJECT_ID, explicit?.client_email);
  if (!projectId) throw new Error('GCS_CONFIG_MISSING:project_id');
  if (!explicit && !process.env.GOOGLE_APPLICATION_CREDENTIALS) throw new Error('GCS_CONFIG_MISSING:credentials');
  return new Storage({ projectId, ...(explicit ? { credentials: explicit } : {}) });
}

export function publicGcsUrl(objectName: string) {
  return gcsPublicUrl(GCS_BUCKET_NAME, objectName);
}
