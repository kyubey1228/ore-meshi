import Link from 'next/link';
import { Bell } from 'lucide-react';
import { getUnreadNotificationCount } from '@/lib/data';

export async function NotificationBell() {
  const count = await getUnreadNotificationCount();
  return (
    <Link href="/notifications" className="notification-bell" aria-label={count > 0 ? `通知 未読${count}件` : '通知'}>
      <Bell size={19} />
      {count > 0 && <span className="notification-badge">{count > 9 ? '9+' : count}</span>}
    </Link>
  );
}
