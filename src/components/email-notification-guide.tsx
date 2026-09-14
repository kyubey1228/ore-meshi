import Link from 'next/link';

export function EmailNotificationGuide({ business = false, hasEmail = false }: { business?: boolean; hasEmail?: boolean }) {
  return <aside className="panel" aria-label="メール通知のご案内">
    <h2>{hasEmail ? 'メール通知を活用しよう' : 'メール登録すると便利！'}</h2>
    <p className="muted">{business
      ? '掲載の成果や契約・お支払いに関するお知らせを、管理画面を開かなくてもメールで確認できます。店舗・企業向け通知はオーナー・管理者が対象です。'
      : '参加希望・承認・飯の成立を、アプリを開かなくてもメールで確認できます。返事待ちや募集中の見逃し対策に。'}</p>
    <div className="row wrap">
      <Link className="btn secondary small" href={hasEmail ? (business ? '/business/account#notification-settings' : '/notifications#notification-settings') : '/profile#email'}>{hasEmail ? '通知設定を確認する' : 'メールアドレスを登録・変更する'}</Link>
      <Link className="text-link" href={business ? '/business/email-notifications' : '/email-notifications'}>メール通知の便利な使い方を見る →</Link>
    </div>
    <p className="muted">登録は任意です。受け取る通知は設定で変更できます。</p>
  </aside>;
}
