'use client';
import { useState, useTransition } from 'react';
import { updateBusinessNotificationPreference } from '@/server/actions/business-notifications';

type Values = { activityEnabled: boolean; campaignPerformanceEnabled: boolean; billingEnabled: boolean; growthTipsEnabled: boolean };
export function BusinessNotificationPreferenceForm({ businessAccountId, initial }: { businessAccountId: string; initial: Values }) {
  const [values, setValues] = useState(initial);
  const [message, setMessage] = useState('');
  const [pending, start] = useTransition();
  const rows: { key: keyof Values; label: string; description: string }[] = [
    { key: 'activityEnabled', label: '店舗の動き', description: '初めての閲覧・反応・成立など' },
    { key: 'campaignPerformanceEnabled', label: '掲載の成果', description: '終了前の改善ヒントや掲載結果' },
    { key: 'billingEnabled', label: '契約・請求', description: 'プラン終了など契約上必要な案内を含みます' },
    { key: 'growthTipsEnabled', label: '飯を呼ぶヒント', description: '未掲載時の始め方や改善案' },
  ];
  return <form className="panel" onSubmit={event => { event.preventDefault(); start(async () => { await updateBusinessNotificationPreference({ businessAccountId, ...values }); setMessage('保存しました'); }); }}>
    <h2>店舗へのお知らせ</h2>
    {rows.map(row => <label className="checkbox-row" key={row.key}><input type="checkbox" checked={values[row.key]} onChange={event => setValues(current => ({ ...current, [row.key]: event.target.checked }))}/><span><strong>{row.label}</strong><small>{row.description}</small></span></label>)}
    <button className="btn" disabled={pending}>{pending ? '保存中…' : '設定を保存'}</button>{message && <p className="success">{message}</p>}
  </form>;
}
