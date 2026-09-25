const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_DIMENSION = 2400;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

async function optimizeImage(file: File) {
  if (!ALLOWED_TYPES.has(file.type)) throw new Error('JPEG、PNG、WebP、AVIF画像を選択してください。');
  if (file.size > MAX_SOURCE_BYTES) throw new Error('元画像は12MB以下にしてください。');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) { bitmap.close(); throw new Error('画像を処理できませんでした。'); }
  context.drawImage(bitmap, 0, 0, width, height); bitmap.close();
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', 0.84));
  if (!blob) throw new Error('WebP画像を生成できませんでした。');
  if (blob.size > MAX_UPLOAD_BYTES) throw new Error('圧縮後の画像が8MBを超えています。より小さい画像を選択してください。');
  return { blob, width, height };
}

export async function uploadArticleImage(file: File, purpose: 'cover' | 'og' | 'body') {
  const optimized = await optimizeImage(file);
  const signed = await fetch('/api/admin/media/upload-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contentType: 'image/webp', size: optimized.blob.size, purpose }) });
  const data = await signed.json() as { ok: boolean; uploadUrl?: string; publicUrl?: string; message?: string };
  if (!signed.ok || !data.uploadUrl || !data.publicUrl) throw new Error(data.message || 'アップロードURLを取得できませんでした。');
  const result = await fetch(data.uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'image/webp' }, body: optimized.blob });
  if (!result.ok) throw new Error(`GCSへのアップロードに失敗しました（${result.status}）。`);
  return { url: data.publicUrl, width: optimized.width, height: optimized.height };
}
