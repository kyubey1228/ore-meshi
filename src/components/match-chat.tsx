'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatData, ChatMessage, ChatState } from '@/lib/match-chat';

export function MatchChat({ matchId, userId, initialState }: { matchId: string; userId: string; initialState: ChatState }) {
  const [data, setData] = useState<ChatData | null>(initialState === 'OPEN' ? null : { state: initialState, messages: [] });
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const attempt = useRef<{ body: string; id: string } | null>(null);
  const revision = useRef(0);
  const endpoint = `/api/matches/${matchId}/chat`;
  const refresh = useCallback(async (signal?: AbortSignal) => {
    const startedRevision = revision.current;
    const timeout = AbortSignal.timeout(15000);
    const response = await fetch(endpoint, { cache: 'no-store', signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
    const result = await response.json();
    if (signal?.aborted || startedRevision !== revision.current) return;
    if (!response.ok) {
      if ([401, 404].includes(response.status)) setData({ state: 'CLOSED', messages: [] });
      throw new Error(result.error || '更新できませんでした。');
    }
    setData(result); setError('');
  }, [endpoint]);
  useEffect(() => {
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      if (!document.hidden) {
        try { await refresh(controller.signal); }
        catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : '更新できませんでした。'); }
      }
      if (!controller.signal.aborted) timer = setTimeout(poll, 5000);
    }
    if (data?.state !== 'CLOSED') void poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [refresh, data?.state]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (sending || !body.trim() || data?.state !== 'OPEN') return;
    const text = body.trim();
    if (attempt.current?.body !== text) attempt.current = { body: text, id: crypto.randomUUID() };
    setSending(true); setError('');
    revision.current++;
    try {
      const response = await fetch(endpoint, { method: 'POST', signal: AbortSignal.timeout(45000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: text, clientMessageId: attempt.current.id }) });
      const result = await response.json();
      if (!response.ok) {
        if ([401, 404, 409].includes(response.status)) setData({ state: 'CLOSED', messages: [] });
        throw new Error(result.error || '送信できませんでした。');
      }
      const message = result.message as ChatMessage;
      setData(previous => previous?.state === 'OPEN' ? { ...previous, messages: [...previous.messages.filter(item => item.id !== message.id), message].slice(-50) } : previous);
      setBody(''); attempt.current = null;
    } catch (error) { setError(error instanceof Error ? error.message : '送信できませんでした。再試行してください。'); }
    finally { revision.current++; setSending(false); }
  }

  return <section id="chat" className="panel scroll-mt-24" aria-label="待ち合わせチャット">
    <h2>待ち合わせチャット</h2>
    <p className="muted">参加者だけに表示されます。待ち合わせ場所や目印を共有しましょう。飯の終了・キャンセルで閉じます。</p>
    {!data && <p role="status">チャットを読み込んでいます…</p>}
    {data?.state === 'WAITING' && <p role="status">飯が成立するとチャットが開きます。</p>}
    {data?.state === 'CLOSED' && <p role="status">このチャットは終了しました。</p>}
    {data?.state === 'OPEN' && <>
      <p className="muted">直近50件を表示・約5秒ごとに更新</p>
      <div role="log" aria-label="チャットのメッセージ" aria-live="polite" className="max-h-80 overflow-y-auto">
        {!data.messages.length && <p>まだメッセージはありません。</p>}
        {data.messages.map(message => <article key={message.id} className="request">
          <strong>{message.sender.displayName}{message.senderId === userId ? '（あなた）' : ''}</strong>{' '}
          <time className="muted" dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>
          <p className="pre-wrap break-words">{message.body}</p>
        </article>)}
      </div>
      <form onSubmit={send}>
        <label>メッセージ<textarea value={body} onChange={event => setBody(event.target.value)} maxLength={1000} rows={3} disabled={sending} placeholder="例：お店の入口で19時に集合しましょう"/></label>
        <button className="btn" disabled={sending || !body.trim()}>{sending ? '送信中…' : '送信する'}</button>
      </form>
    </>}
    {error && <p role="alert" className="error">{error}</p>}
  </section>;
}
