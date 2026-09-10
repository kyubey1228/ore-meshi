import Link from 'next/link';
import { getGrowthDashboard } from '@/server/growth-admin';
import { getDemandDashboard, getNotificationAnalysis, getPhase3Overview, getSupplyDemandGap, getTimeToMatchStats } from '@/server/phase3-admin';
import { getGrowthInsights } from '@/server/growth-insights';

export const metadata = { title: 'Growth Dashboard' };

const PERIODS = [7, 30, 90];

function percent(n: number) { return `${Math.round(n * 100)}%`; }
function hours(n: number | null) { return n === null ? 'データ不足' : n < 24 ? `${n.toFixed(1)}時間` : `${(n / 24).toFixed(1)}日`; }

export default async function GrowthDashboard({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days: rawDays } = await searchParams;
  const days = PERIODS.includes(Number(rawDays)) ? Number(rawDays) : 30;
  const [data, overview, timeToMatch, notificationAnalysis, demand, supplyGap, insights] = await Promise.all([
    getGrowthDashboard(days),
    getPhase3Overview(days),
    getTimeToMatchStats(days),
    getNotificationAnalysis(days),
    getDemandDashboard(days),
    getSupplyDemandGap(),
    getGrowthInsights(days),
  ]);
  const maxAreaCount = Math.max(1, ...data.topCompletedAreas.map(a => a.count));
  const timeToMatchChange = timeToMatch.medianTimeToMatchHours !== null && timeToMatch.previousMedianTimeToMatchHours
    ? Math.round(((timeToMatch.medianTimeToMatchHours - timeToMatch.previousMedianTimeToMatchHours) / timeToMatch.previousMedianTimeToMatchHours) * 100)
    : null;

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
        <h2>今週確認すべき変化</h2>
        {insights.map((text, i) => <p key={i}>・{text}</p>)}
      </div>

      <div className="panel">
        <h2>North Star KPI</h2>
        <p className="muted">「実際に誰かと飯を食べるところまで到達するユーザーを増やす」を軸にした指標です。</p>
        <div className="analytics-grid">
          <div><strong>{overview.weeklySuccessfulMeals}</strong><span>Weekly Successful Meals(直近7日)</span></div>
          <div><strong>{percent(overview.recruitmentFillRate)}</strong><span>Recruitment Fill Rate</span></div>
          <div><strong>{percent(overview.signupToFirstJoinRate)}</strong><span>Signup→First Join</span></div>
          <div><strong>{percent(overview.signupToSuccessfulMealRate)}</strong><span>Signup→Successful Meal</span></div>
          <div><strong>{percent(overview.d1RetentionRate)}</strong><span>D1 Retention</span></div>
          <div><strong>{percent(overview.d7RetentionRate)}</strong><span>D7 Retention</span></div>
          <div><strong>{percent(overview.secondJoinRate)}</strong><span>Second Join Rate</span></div>
          <div><strong>{percent(overview.secondRecruitmentRate)}</strong><span>Second Recruitment Rate</span></div>
          <div><strong>{overview.referralActivatedUsers}</strong><span>Referral Activated Users</span></div>
        </div>
        <p className="muted">Retention/First Join/Successful Mealは、この期間に登録した{overview.signupCohortSize}人が対象です。DBに保存されたJoinRequest/Meal/MatchParticipant/Notificationの発生をもって「活動あり」とみなす簡易指標のため、閲覧のみのユーザーは含まれません。</p>
      </div>

      <div className="panel">
        <h2>Time to Match</h2>
        <p className="muted">Time to First Join = 募集作成から最初の有効な参加希望まで(中央値)。Time to Match = 募集作成から必要人数に到達し成立するまで(中央値)。募集成立の定義: <strong>参加人数が募集人数に到達した時点</strong>(host自身の手動確定操作はなく、承認によって自動的に成立します)。</p>
        <div className="analytics-grid">
          <div><strong>{hours(timeToMatch.medianTimeToFirstJoinHours)}</strong><span>Median Time to First Join</span></div>
          <div><strong>{hours(timeToMatch.medianTimeToMatchHours)}</strong><span>Median Time to Match</span></div>
          <div><strong>{timeToMatchChange === null ? '—' : `${timeToMatchChange >= 0 ? '+' : ''}${timeToMatchChange}%`}</strong><span>前期間比</span></div>
        </div>
        <div className="two-col">
          <div>
            <h3>エリア別(サンプル3件以上)</h3>
            {timeToMatch.areaStats.length === 0 ? <p className="muted">データ不足です。</p> : timeToMatch.areaStats.slice(0, 8).map(a => <p key={a.area}>{a.area}: {hours(a.medianHours)}（{a.sampleSize}件）</p>)}
          </div>
          <div>
            <h3>ジャンル別(サンプル3件以上)</h3>
            {timeToMatch.genreStats.length === 0 ? <p className="muted">データ不足です。</p> : timeToMatch.genreStats.slice(0, 8).map(g => <p key={g.genre}>{g.genre}: {hours(g.medianHours)}（{g.sampleSize}件）</p>)}
          </div>
        </div>
      </div>

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
          <div><strong>{overview.referralActivatedUsers}</strong><span>Referral Activated(累計)</span></div>
          <div><strong>{percent(overview.referralActivationRate)}</strong><span>Activation率(登録済み紹介のうち)</span></div>
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
        <h2>通知</h2>
        <p className="muted">通知回数が多いだけで成功扱いにはしていません。開封・クリック・種類別CVRで見てください。</p>
        <div className="analytics-grid">
          <div><strong>{notificationAnalysis.total}</strong><span>sent</span></div>
          <div><strong>{notificationAnalysis.opened}</strong><span>opened</span></div>
          <div><strong>{notificationAnalysis.clicked}</strong><span>clicked</span></div>
          <div><strong>{percent(notificationAnalysis.openRate)}</strong><span>開封率</span></div>
          <div><strong>{percent(notificationAnalysis.clickRate)}</strong><span>クリック率(Notification Return Rate)</span></div>
        </div>
        {notificationAnalysis.byType.length > 0 && <div className="comparison-scroll"><table><thead><tr><th>種類</th><th>sent</th><th>opened</th><th>clicked</th><th>CVR</th></tr></thead><tbody>{notificationAnalysis.byType.map(t => <tr key={t.type}><td>{t.type}</td><td>{t.sent}</td><td>{t.opened}</td><td>{t.clicked}</td><td>{percent(t.clickRate)}</td></tr>)}</tbody></table></div>}
      </div>

      <div className="panel">
        <h2>Demand Intent</h2>
        <div className="analytics-grid">
          <div><strong>{demand.created}</strong><span>demand_intent作成数</span></div>
          <div><strong>{demand.matched}</strong><span>matched intents</span></div>
          <div><strong>{percent(demand.matchRate)}</strong><span>Demand Match Rate</span></div>
          <div><strong>{demand.recruitmentsCreated}</strong><span>recruitment created</span></div>
          <div><strong>{demand.successfulFromDemand}</strong><span>successful meals(from demand)</span></div>
        </div>
        <div className="two-col">
          <div><h3>エリア別需要</h3>{demand.byArea.length === 0 ? <p className="muted">データ不足です。</p> : demand.byArea.map(a => <p key={a.area}>{a.area}: {a.count}件</p>)}</div>
          <div><h3>ジャンル別需要</h3>{demand.byGenre.length === 0 ? <p className="muted">データ不足です。</p> : demand.byGenre.map(g => <p key={g.genre}>{g.genre}: {g.count}件</p>)}</div>
        </div>
      </div>

      <div className="panel">
        <h2>Supply / Demand Gap(過去30日、上位)</h2>
        <p className="muted">需要はあるが募集が少ないエリアほど上位に表示されます。</p>
        {supplyGap.length === 0 ? <p className="muted">データ不足です。</p> : (
          <div className="comparison-scroll"><table><thead><tr><th>Area</th><th>Demand Intents</th><th>Active Meals</th><th>Fill Rate</th></tr></thead><tbody>{supplyGap.map(g => <tr key={g.area}><td>{g.area}</td><td>{g.demandIntents}</td><td>{g.activeMeals}</td><td>{percent(g.fillRate)}</td></tr>)}</tbody></table></div>
        )}
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
