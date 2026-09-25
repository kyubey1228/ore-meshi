'use client';
import Image from 'next/image';
import { useState } from 'react';
import { uploadArticleImage } from '@/lib/upload-image-client';

export function MediaImageUploader({ name, label, purpose, defaultValue = '', includeDimensions = false, defaultWidth = 1200, defaultHeight = 630 }: { name: 'coverImage' | 'ogImage'; label: string; purpose: 'cover' | 'og'; defaultValue?: string; includeDimensions?: boolean; defaultWidth?: number; defaultHeight?: number }) {
  const [url, setUrl] = useState(defaultValue); const [width, setWidth] = useState(defaultWidth); const [height, setHeight] = useState(defaultHeight); const [message, setMessage] = useState<string>(); const [uploading, setUploading] = useState(false);
  async function upload(file?: File) {
    if (!file) return;
    setUploading(true); setMessage('画像をアップロードしています…');
    try {
      const uploaded = await uploadArticleImage(file, purpose);
      setUrl(uploaded.url); setWidth(uploaded.width); setHeight(uploaded.height); setMessage('アップロードしました。記事を保存するとURLが登録されます。');
    } catch (error) { setMessage(error instanceof Error ? error.message : '画像をアップロードできませんでした。'); }
    finally { setUploading(false); }
  }
  return <div className="media-image-uploader"><label>{label}<input type="url" name={name} value={url} onChange={event => setUrl(event.target.value)} placeholder="https://storage.googleapis.com/ore-meshi/articles/..." /></label><label className="upload-picker">画像を選択<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={uploading} onChange={event => void upload(event.target.files?.[0])} /></label>{includeDimensions && <><input type="hidden" name="imageWidth" value={width}/><input type="hidden" name="imageHeight" value={height}/></>}{url && <Image src={url} alt="アップロード画像のプレビュー" width={width} height={height} unoptimized />}{message && <p role="status" className={message.includes('失敗') || message.includes('できません') || message.includes('超え') ? 'error' : 'muted'}>{message}</p>}</div>;
}
