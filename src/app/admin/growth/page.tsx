import Link from 'next/link';
import { getGrowthDashboard } from '@/server/growth-admin';

export const metadata = { title: 'Growth Dashboard' };

const PERIODS = [7, 30, 90];

function percent(n: number) { return `${Math.round(n * 100)}%`; }

export default async function GrowthDashboard({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days: rawDays } = await searchParams;
  const days = PERIODS.includes(Number(rawDays)) ? Number(rawDays) : 30;
  const data = await getGrowthDashboard(days);
  const maxAreaCount = Math.max(1, ...data.topCompletedAreas.map(a => a.count));

  return (
    <section className="section">
      <div className="section-heading">
        <h1>Growth Dashboard</h1>
        <div className="tag-pills">
          {PERIODS.map(p => <Link key={p} className={`tag-pill${days === p ? ' orange-pill' : ''}`} href={`/admin/growth?days=${p}`}>{p}日間</Link>)}
        </div>
      </div>
      <Link className="text-link" href="/admin/leads">営業Lead管理へ →</Link>

      <div className="panel">
        <h2>登録ファネル</h2>
        <div className="analytics-grid">
          <div><strong>{data.signupStarted}</strong><span>signup_started</span></div>
          <div><strong>{data.signupCompleted}</strong><span>signup_completed</span></div>
          <div><strong>{percent(data.signupConversionRate)}</strong><span>登録完了率</span></div>
          <div><strong>{data.joinIntentCreated}</strong><span>参加意図(join intent)</span></div>
          <div><strong>{percent(data.joinAfterSignupRate)}</strong><span>登録後参加率</span></div>
        </div>
      </div>

      <div className="panel">
        <h2>シェア・紹介</h2>
        <div className="analytics-grid">
          <div><strong>{data.shareTotal}</strong><span>シェア数</span></div>
          <div><strong>{data.referralOpens}</strong><span>招待URL開封</span></div>
          <div><strong>{data.referralSignups}</strong><span>紹介経由登録</span></div>
          <div><strong>{percent(data.referralConversionRate)}</strong><span>紹介登録率</span></div>
        </div>
      </div>

      <div className="panel">
        <h2>Quick Post</h2>
        <div className="analytics-grid">
          <div><strong>{data.quickPostStarted}</strong><span>quick_post_started</span></div>
          <div><strong>{data.quickPostCompleted}</strong><span>quick_post_completed</span></div>
          <div><strong>{percent(data.quickPostCompletionRate)}</strong><span>完了率</span></div>
        </div>
      </div>

      <div className="panel">
        <h2>エリア別 成立数（飯が実際に成立した数）</h2>
        {data.topCompletedAreas.length === 0
          ? <p className="muted">まだ成立実績がありません。</p>
          : <div className="area-bars">{data.topCompletedAreas.map(a => (
              <div className="area-bar-row" key={a.area}>
                <span>{a.area}</span>
                <div className="area-bar-track"><div className="area-bar-fill" style={{ width: `${(a.count / maxAreaCount) * 100}%` }} /></div>
                <strong>{a.count}</strong>
              </div>
            ))}</div>}
      </div>
    </section>
  );
}
