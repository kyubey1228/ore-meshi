'use client';
import { useCallback, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TiptapImage from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { uploadArticleImage } from '@/lib/upload-image-client';

type HeadingLevel = 2 | 3 | 4;
const HEADING_OPTIONS: { value: 'p' | HeadingLevel; label: string }[] = [{ value: 'p', label: '段落' }, { value: 2, label: '見出し2' }, { value: 3, label: '見出し3' }, { value: 4, label: '見出し4' }];

export function ArticleContentEditor({ defaultValue }: { defaultValue?: string }) {
  const [html, setHtml] = useState(defaultValue ?? '');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      TiptapImage,
      Placeholder.configure({ placeholder: '本文を入力…' }),
    ],
    content: defaultValue || '',
    onUpdate: ({ editor }) => setHtml(editor.getHTML()),
    editorProps: { attributes: { class: 'content-editor-surface' } },
  });

  const insertImage = useCallback(async (file?: File) => {
    if (!file || !editor) return;
    setUploading(true);
    try {
      const uploaded = await uploadArticleImage(file, 'body');
      const alt = window.prompt('画像の代替テキスト（alt）', '') ?? '';
      editor.chain().focus().setImage({ src: uploaded.url, alt }).run();
    } catch (error) { window.alert(error instanceof Error ? error.message : '画像をアップロードできませんでした。'); }
    finally { setUploading(false); }
  }, [editor]);

  function setLink() {
    if (!editor) return;
    const previous = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('リンク先URL', previous ?? 'https://');
    if (url === null) return;
    if (!url) { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }

  if (!editor) return <div className="content-editor" />;
  const activeHeading = ([2, 3, 4] as const).find(level => editor.isActive('heading', { level })) ?? 'p';

  return <div className="content-editor">
    <div className="content-editor-toolbar">
      <select aria-label="見出しレベル" value={activeHeading} onChange={event => { const value = event.target.value; if (value === 'p') editor.chain().focus().setParagraph().run(); else editor.chain().focus().toggleHeading({ level: Number(value) as HeadingLevel }).run(); }}>
        {HEADING_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <button type="button" className={`btn secondary small${editor.isActive('bold') ? ' active' : ''}`} onClick={() => editor.chain().focus().toggleBold().run()}><strong>B</strong></button>
      <button type="button" className={`btn secondary small${editor.isActive('italic') ? ' active' : ''}`} onClick={() => editor.chain().focus().toggleItalic().run()}><em>I</em></button>
      <button type="button" className={`btn secondary small${editor.isActive('strike') ? ' active' : ''}`} onClick={() => editor.chain().focus().toggleStrike().run()}><s>S</s></button>
      <button type="button" className={`btn secondary small${editor.isActive('bulletList') ? ' active' : ''}`} onClick={() => editor.chain().focus().toggleBulletList().run()}>箇条書き</button>
      <button type="button" className={`btn secondary small${editor.isActive('orderedList') ? ' active' : ''}`} onClick={() => editor.chain().focus().toggleOrderedList().run()}>番号リスト</button>
      <button type="button" className={`btn secondary small${editor.isActive('blockquote') ? ' active' : ''}`} onClick={() => editor.chain().focus().toggleBlockquote().run()}>引用</button>
      <button type="button" className={`btn secondary small${editor.isActive('link') ? ' active' : ''}`} onClick={setLink}>リンク</button>
      <button type="button" className="btn secondary small" disabled={uploading} onClick={() => fileInputRef.current?.click()}>{uploading ? 'アップロード中…' : '画像'}</button>
      <button type="button" className="btn secondary small" onClick={() => editor.chain().focus().setHorizontalRule().run()}>区切り線</button>
      <button type="button" className="btn secondary small" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>元に戻す</button>
      <button type="button" className="btn secondary small" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>やり直す</button>
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden onChange={event => { void insertImage(event.target.files?.[0]); event.target.value = ''; }} />
    </div>
    <EditorContent editor={editor} />
    <input type="hidden" name="content" value={html} />
  </div>;
}
