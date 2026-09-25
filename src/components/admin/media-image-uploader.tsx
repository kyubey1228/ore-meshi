'use client';
import Image from 'next/image';
import { useState } from 'react';

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

export function MediaImageUploader({ name, label, purpose, defaultValue = '', includeDimensions = false, defaultWidth = 1200, defaultHeight = 630 }: { name: 'coverImage' | 'ogImage'; label: string; purpose: 'cover' | 'og'; defaultValue?: string; includeDimensions?: boolean; defaultWidth?: number; defaultHeight?: number }) {
  const [url, setUrl] = useState(defaultValue); const [width, setWidth] = useState(defaultWidth); const [height, setHeight] = useState(defaultHeight); const [message, setMessage] = useState<string>(); const [uploading, setUploading] = useState(false);
  async function upload(file?: File) {
    if (!file) return;
    setUploading(true); setMessage('画像を圧縮しています…');
    try {
      const optimized = await optimizeImage(file);
      setMessage('GCSへアップロードしています…');
      const signed = await fetch('/api/admin/media/upload-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contentType: 'image/webp', size: optimized.blob.size, purpose }) });
      const data = await signed.json() as { ok: boolean; uploadUrl?: string; publicUrl?: string; message?: string };
      if (!signed.ok || !data.uploadUrl || !data.publicUrl) throw new Error(data.message || 'アップロードURLを取得できませんでした。');
      const result = await fetch(data.uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'image/webp' }, body: optimized.blob });
      if (!result.ok) throw new Error(`GCSへのアップロードに失敗しました（${result.status}）。`);
      setUrl(data.publicUrl); setWidth(optimized.width); setHeight(optimized.height); setMessage('アップロードしました。記事を保存するとURLが登録されます。');
    } catch (error) { setMessage(error instanceof Error ? error.message : '画像をアップロードできませんでした。'); }
    finally { setUploading(false); }
  }
  return <div className="media-image-uploader"><label>{label}<input type="url" name={name} value={url} onChange={event => setUrl(event.target.value)} placeholder="https://storage.googleapis.com/ore-meshi/articles/..." /></label><label className="upload-picker">画像を選択<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={uploading} onChange={event => void upload(event.target.files?.[0])} /></label>{includeDimensions && <><input type="hidden" name="imageWidth" value={width}/><input type="hidden" name="imageHeight" value={height}/></>}{url && <Image src={url} alt="アップロード画像のプレビュー" width={width} height={height} unoptimized />}{message && <p role="status" className={message.includes('失敗') || message.includes('できません') || message.includes('超え') ? 'error' : 'muted'}>{message}</p>}</div>;
}
