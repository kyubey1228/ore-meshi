'use client';
import { ActionForm } from '@/components/action-form';
import { updateNotificationPreference } from '@/server/actions/notifications';

type Preference = { recruitmentEnabled: boolean; participationEnabled: boolean; recommendationEnabled: boolean };

export function NotificationPreferenceForm({ preference }: { preference: Preference }) {
  return (
    <div className="panel">
      <h2>通知設定</h2>
      <ActionForm label="設定を保存" action={data => updateNotificationPreference({
        recruitmentEnabled: data.get('recruitmentEnabled') === 'on',
        participationEnabled: data.get('participationEnabled') === 'on',
        recommendationEnabled: data.get('recommendationEnabled') === 'on',
      })}>
        <label className="row"><input type="checkbox" name="recruitmentEnabled" defaultChecked={preference.recruitmentEnabled} />開催関連通知（締切・当日・残り1席など）</label>
        <label className="row"><input type="checkbox" name="participationEnabled" defaultChecked={preference.participationEnabled} />参加関連通知（参加申請・承認・成立）</label>
        <label className="row"><input type="checkbox" name="recommendationEnabled" defaultChecked={preference.recommendationEnabled} />おすすめ募集通知</label>
      </ActionForm>
    </div>
  );
}
