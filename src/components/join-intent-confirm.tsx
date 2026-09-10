'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { confirmJoinIntent } from '@/server/actions/join-intent';

type Props = { token: string; candidates: { id: string; label: string }[] };

export function JoinIntentConfirm({ token, candidates }: Props) {
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const router = useRouter();

  function onSubmit(formData: FormData) {
    setError('');
    start(async () => {
      const result = await confirmJoinIntent({ token, candidateId: formData.get('candidateId'), message: formData.get('message') });
      if (!result.ok) { setError(result.message); return; }
      setDone(true);
      router.refresh();
    });
  }

  if (done) return <p className="success">参加を確定しました。ホストからの返事を待ちましょう。</p>;

  return (
    <div className="panel last-slot">
      <h2>登録が完了しました。この募集に参加しますか？</h2>
      <form className="action-form" action={onSubmit}>
        <fieldset disabled={pending}>
          <label>行ける日時<select name="candidateId" required>{candidates.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
          <label>ひとこと（任意）<textarea name="message" maxLength={500} placeholder="はじめまして！ 一緒に行きたいです。" /></label>
          <button className="btn wide" disabled={pending}>{pending ? '送信中…' : '参加を確定する'}</button>
        </fieldset>
      </form>
      {error && <p role="alert" className="error">{error}</p>}
    </div>
  );
}
