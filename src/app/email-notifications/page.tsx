import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'メール通知について', description: 'メールアドレスを登録すると、参加承認や飯の成立をアプリを開かなくても受け取れます。' };

const benefits = [
  ['参加希望が届いたら', '自分の募集に参加希望が届いたことを、アプリを開かなくてもすぐ知れます。'],
  ['参加が承認されたら', '「飯の予定が決まりました🍚」を見逃さず、すぐに日時・場所を確認できます。'],
  ['飯が成立したら', '一緒に飯を食う人が決まった瞬間を、通知が来た時点で確認できます。'],
  ['前日のリマインド', '開催前日に「明日の飯、忘れてませんか？」と一言届きます。'],
  ['開催後のひとこと', '感想を送り忘れないよう、時間をおいてそっと知らせます。'],
] as const;

export default function EmailNotificationsPage() {
  return (
    <section className="section narrow">
      <span className="eyebrow orange">EMAIL</span>
      <h1>メールアドレスを登録すると、こんなに便利。</h1>
      <p>「俺は誰かと飯が食いたい！」は普段アプリ内の通知で動きを知らせていますが、メールアドレスを登録すると同じ内容をメールでも受け取れるようになります。</p>
      <div className="sales-grid">
        {benefits.map(([title, body]) => (
          <article className="panel" key={title}>
            <h2>{title}</h2>
            <p>{body}</p>
          </article>
        ))}
      </div>
      <div className="panel">
        <h2>使い方はシンプルです</h2>
        <p>メールが使われるのはこれらの通知だけです。おすすめ募集などのお知らせメールは別の設定になっていて、通知ページからいつでもON/OFFを切り替えられます。パスワードの入力や連携は必要ありません。</p>
      </div>
      <div className="hero-actions">
        <Link className="btn" href="/profile">プロフィールでメールアドレスを登録する →</Link>
        <Link className="text-link" href="/notifications">通知設定を見る</Link>
      </div>
    </section>
  );
}
