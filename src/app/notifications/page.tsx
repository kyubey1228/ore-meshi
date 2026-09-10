import Link from 'next/link';
import { requirePageUser } from '@/server/auth';
import { getNotificationPreference, getNotifications } from '@/lib/data';
import { NotificationRow } from '@/components/notification-row';
import { NotificationPreferenceForm } from '@/components/notification-preference-form';
import { ActionForm } from '@/components/action-form';
import { markAllNotificationsRead } from '@/server/actions/notifications';

export const metadata = { title: '通知' };

export default async function NotificationsPage() {
  const userId = await requirePageUser('/notifications');
  const [notifications, preference] = await Promise.all([getNotifications(), getNotificationPreference(userId)]);
  const unreadCount = notifications.filter(n => !n.readAt).length;

  return (
    <section className="section narrow">
      <div className="section-heading">
        <h1>通知</h1>
        {unreadCount > 0 && <ActionForm label="すべて既読にする" action={() => markAllNotificationsRead()} />}
      </div>
      {notifications.length === 0 ? (
        <div className="empty"><span className="empty-icon">🔔</span><p>通知はまだありません。募集や参加に動きがあるとここに届きます。</p></div>
      ) : (
        <div className="panel">{notifications.map(n => <NotificationRow key={n.id} notification={n} />)}</div>
      )}
      <NotificationPreferenceForm preference={preference} />
      <Link className="text-link" href="/mypage">← マイページへ</Link>
    </section>
  );
}
