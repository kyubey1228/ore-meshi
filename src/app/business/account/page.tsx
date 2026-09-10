import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentBusinessMembership, getBusinessTeam } from '@/server/business';
import { getBusinessBillingState } from '@/server/billing';
import { getCurrentUser } from '@/lib/data';
import { UserAvatar } from '@/components/meal-card';
import { LogoutButton } from '@/components/auth-buttons';
import { prisma } from '@/lib/prisma';
import { BusinessNotificationPreferenceForm } from '@/components/business-notification-preference-form';

const PLAN_LABEL_JA = { FREE: 'フリープラン', STANDARD: 'スタンダードプラン', PRO: 'PROプラン' } as const;
const ROLE_LABEL_JA = { OWNER: 'オーナー', ADMIN: '管理者', STAFF: 'スタッフ' } as const;
const ACCOUNT_STATUS_LABEL_JA = { PENDING: '確認中', ACTIVE: '有効', SUSPENDED: '停止中' } as const;

export const metadata = { title: 'アカウント設定 | 店舗・企業向け' };

export default async function BusinessAccountPage() {
  const membership = await currentBusinessMembership();
  if (!membership) redirect('/business/onboarding');
  const [user, billing, team, notificationPreference] = await Promise.all([
    getCurrentUser(),
    // STAFF権限やPENDING/SUSPENDED状態ではgetBusinessBillingState()がensure()で弾くため、
    // アカウント設定ページ自体(ログアウト等)は使えるようプラン取得の失敗だけは許容する。
    getBusinessBillingState(membership.businessAccountId).catch(() => null),
    getBusinessTeam(membership.businessAccountId),
    prisma.businessNotificationPreference.findUnique({ where: { businessAccountId: membership.businessAccountId } }),
  ]);
  if (!user) redirect('/login?next=%2Fbusiness%2Faccount');

  return (
    <section className="section narrow">
      <div className="section-heading">
        <div>
          <span className="eyebrow orange">BUSINESS ACCOUNT</span>
          <h1>アカウント設定</h1>
        </div>
      </div>

      <BusinessNotificationPreferenceForm businessAccountId={membership.businessAccountId} initial={notificationPreference ?? { activityEnabled: true, campaignPerformanceEnabled: true, billingEnabled: true, growthTipsEnabled: true }} />

      <div className="panel">
        <h2>ログイン中のXアカウント</h2>
        <div className="row">
          <UserAvatar user={user} />
          <div>
            <strong>{user.displayName}</strong>
            <p className="muted">@{user.twitterUsername}</p>
          </div>
        </div>
        <div className="row wrap">
          <Link className="text-link" href="/profile">プロフィール編集</Link>
          <Link className="text-link" href="/mypage">一般ユーザーのマイページ</Link>
          <LogoutButton />
        </div>
      </div>

      <div className="panel">
        <h2>所属店舗</h2>
        <div className="row between">
          <div>
            <strong>{membership.businessAccount.name}</strong>
            <p className="muted">{membership.businessAccount.area ?? 'エリア未設定'} · {ROLE_LABEL_JA[membership.role]} · {ACCOUNT_STATUS_LABEL_JA[membership.businessAccount.status]}</p>
          </div>
          <Link className="btn secondary small" href="/business/dashboard">店舗管理へ</Link>
        </div>
        {team.length > 1 && (
          <div className="dashboard-grid">
            {team.map(member => (
              <div className="row" key={`${member.businessAccountId}:${member.userId}`}>
                <UserAvatar user={member.user} />
                <div>
                  <strong>{member.user.displayName}</strong>
                  <p className="muted">@{member.user.twitterUsername} · {ROLE_LABEL_JA[member.role]}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel">
        <h2>プラン</h2>
        {billing ? <p className="muted">現在のプラン：{PLAN_LABEL_JA[billing.plan]}</p> : <p className="muted">プランの確認にはオーナー・管理者権限が必要です。</p>}
        <Link className="text-link" href="/business/billing">プランを見る・変更する →</Link>
      </div>
    </section>
  );
}
