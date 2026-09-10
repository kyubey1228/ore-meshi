'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { markNotificationClicked } from '@/server/actions/notifications';

type NotificationItem = { id: string; title: string; body: string; readAt: Date | null; createdAt: Date };

export function NotificationRow({ notification }: { notification: NotificationItem }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function onClick() {
    start(async () => {
      const result = await markNotificationClicked(notification.id);
      if (result.href) router.push(result.href);
      else router.refresh();
    });
  }

  return (
    <button type="button" className={`notification-item${notification.readAt ? '' : ' unread'}`} onClick={onClick} disabled={pending} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}>
      <strong>{notification.title}</strong>
      <span>{notification.body}</span>
      <small>{new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(notification.createdAt))}</small>
    </button>
  );
}
