'use client';
import Link from 'next/link';
import { ActionForm } from '@/components/action-form';
import { updateNotificationPreference } from '@/server/actions/notifications';

type Preference = { recruitmentEnabled: boolean; participationEnabled: boolean; recommendationEnabled: boolean; emailTransactionalEnabled: boolean; emailMarketingEnabled: boolean };

export function NotificationPreferenceForm({ preference, hasEmail }: { preference: Preference; hasEmail: boolean }) {
  return (
    <div className="panel">
      <h2>通知設定</h2>
      <ActionForm label="設定を保存" action={data => updateNotificationPreference({
        recruitmentEnabled: data.get('recruitmentEnabled') === 'on',
        participationEnabled: data.get('participationEnabled') === 'on',
        recommendationEnabled: data.get('recommendationEnabled') === 'on',
        emailTransactionalEnabled: data.get('emailTransactionalEnabled') === 'on',
        emailMarketingEnabled: data.get('emailMarketingEnabled') === 'on',
      })}>
        <label className="row"><input type="checkbox" name="recruitmentEnabled" defaultChecked={preference.recruitmentEnabled} />開催関連通知（締切・当日・残り1席など）</label>
        <label className="row"><input type="checkbox" name="participationEnabled" defaultChecked={preference.participationEnabled} />参加関連通知（参加申請・承認・成立）</label>
        <label className="row"><input type="checkbox" name="recommendationEnabled" defaultChecked={preference.recommendationEnabled} />おすすめ募集通知</label>
        <hr />
        {hasEmail ? <>
          <label className="row"><input type="checkbox" name="emailTransactionalEnabled" defaultChecked={preference.emailTransactionalEnabled} />重要な通知をメールでも受け取る（参加承認・成立・締切間近など）</label>
          <label className="row"><input type="checkbox" name="emailMarketingEnabled" defaultChecked={preference.emailMarketingEnabled} />おすすめ・お知らせをメールでも受け取る</label>
        </> : (
          <div className="notice">
            <p>メールアドレスを登録すると、参加承認や飯の成立をアプリを開かなくてもメールで受け取れます。見逃したくない人におすすめです。</p>
            <Link className="btn secondary" href="/profile">メールアドレスを登録する →</Link>
          </div>
        )}
      </ActionForm>
    </div>
  );
}
