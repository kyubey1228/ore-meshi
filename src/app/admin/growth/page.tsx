import Link from 'next/link';
import { getGrowthDashboard } from '@/server/growth-admin';
import { getCompletionStats, getDemandDashboard, getNotificationAnalysis, getPhase3Overview, getRepeatStats, getSupplyDemandGap, getTimeToMatchStats } from '@/server/phase3-admin';
import { getGrowthInsights } from '@/server/growth-insights';

export const metadata = { title: 'Growth Dashboard' };

const PERIODS = [7, 30, 90];

function percent(n: number) { return `${Math.round(n * 100)}%`; }
function hours(n: number | null) { return n === null ? 'データ不足' : n < 24 ? `${n.toFixed(1)}時間` : `${(n / 24).toFixed(1)}日`; }
function days(n: number | null) { return n === null ? 'データ不足' : `${n.toFixed(1)}日`; }

export default async function GrowthDashboard({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days: rawDays } = await searchParams;
  const days_ = PERIODS.includes(Number(rawDays)) ? Number(rawDays) : 30;
  const [data, overview, completion, timeToMatch, repeat, notificationAnalysis, demand, supplyGap, insights] = await Promise.all([
    getGrowthDashboard(days_),
    getPhase3Overview(days_),
    getCompletionStats(days_),
    getTimeToMatchStats(days_),
    getRepeatStats(),
    getNotificationAnalysis(days_),
    getDemandDashboard(days_),
    getSupplyDemandGap(),
    getGrowthInsights(days_),
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
          {PERIODS.map(p => <Link key={p} className={`tag-pill${days_ === p ? ' orange-pill' : ''}`} href={`/admin/growth?days=${p}`}>{p}日間</Link>)}
        </div>
      </div>
      <div className="row wrap">
        <Link className="text-link" href="/admin/leads">営業Lead管理へ →</Link>
        <Link className="text-link" href="/admin/business">Business Dashboardへ →</Link>
      </div>

      <div className="panel">
        <h2>今週確認すべき変化</h2>
        {insights.map((text, i) => <p key={i}>・{text}</p>)}
      </div>

      <div className="panel">
        <h2>最重要指標（North Star）</h2>
        <p className="muted">「実際に誰かと飯を食べるところまで到達するユーザーを増やす」ことを最優先の指標とします。登録数やMatched（人数到達）だけでは成功とみなしません。</p>
        <div className="analytics-grid">
          <div><strong>{completion.weeklyCompletedMeals}</strong><span>週間 実際に開催された飯の数（直近7日・Completed）</span></div>
          <div><strong>{completion.weeklyUsersWhoActuallyDined}</strong><span>週間 実際に飯を食べたユーザー数（直近7日）</span></div>
          <div><strong>{percent(overview.recruitmentFillRate)}</strong><span>募集成立率（Matched / 募集数）</span></div>
          <div><strong>{percent(completion.matchToCompletedRate)}</strong><span>Matched → Completed 到達率</span></div>
        </div>
      </div>

      <div className="panel">
        <h2>登録〜継続の全体指標</h2>
        <div className="analytics-grid">
          <div><strong>{percent(overview.signupToFirstJoinRate)}</strong><span>登録 → 初参加率</span></div>
          <div><strong>{percent(overview.signupToSuccessfulMealRate)}</strong><span>登録 → 成立体験率</span></div>
          <div><strong>{percent(overview.d1RetentionRate)}</strong><span>翌日継続率（D1）</span></div>
          <div><strong>{percent(overview.d7RetentionRate)}</strong><span>1週間継続率（D7）</span></div>
          <div><strong>{percent(overview.secondJoinRate)}</strong><span>2回目参加率</span></div>
          <div><strong>{percent(overview.secondRecruitmentRate)}</strong><span>2回目募集率</span></div>
          <div><strong>{overview.referralActivatedUsers}</strong><span>紹介経由アクティブ化ユーザー数（累計）</span></div>
        </div>
        <p className="muted">継続/初参加/成立体験は、この期間に登録した{overview.signupCohortSize}人が対象です。DBに保存されたJoinRequest/Meal/MatchParticipant/Notificationの発生をもって「活動あり」とみなす簡易指標のため、閲覧のみのユーザーは含まれません。</p>
      </div>

      <div className="panel">
        <h2>2回目利用（リピート）</h2>
        <div className="analytics-grid">
          <div><strong>{days(repeat.medianDaysToSecondJoin)}</strong><span>2回目参加までの中央値日数</span></div>
          <div><strong>{percent(repeat.firstCompletedToSecondJoinRate)}</strong><span>初回Completed後の2回目参加率（近似値・{repeat.completedUserSampleSize}人）</span></div>
        </div>
      </div>

      <div className="panel">
        <h2>成立までの時間（Time to Match）</h2>
        <p className="muted">初参加までの時間 = 募集作成から最初の有効な参加希望まで。成立までの時間 = 募集作成から必要人数に到達しMatchedになるまで。<strong>Matched（成立）</strong>＝参加人数が募集人数に到達した時点。<strong>Completed（実際の開催）</strong>＝参加者が「開催された」と確認した時点。この2つは別概念です。Matchedになっても実際には開催されない（Completedに至らない）ケースがあります。</p>
        <div className="analytics-grid">
          <div><strong>{hours(timeToMatch.medianTimeToFirstJoinHours)}</strong><span>初参加までの中央値時間</span></div>
          <div><strong>{hours(timeToMatch.medianTimeToMatchHours)}</strong><span>成立までの中央値時間</span></div>
          <div><strong>{timeToMatchChange === null ? '—' : `${timeToMatchChange >= 0 ? '+' : ''}${timeToMatchChange}%`}</strong><span>前期間比</span></div>
        </div>
        <div className="two-col">
          <div>
            <h3>成立までの時間（パーセンタイル）</h3>
            {timeToMatch.matchPercentiles.sampleSize === 0 ? <p className="muted">データ不足です。</p> : (
              <p>P25: {hours(timeToMatch.matchPercentiles.p25)} ・ P50: {hours(timeToMatch.matchPercentiles.p50)} ・ P75: {hours(timeToMatch.matchPercentiles.p75)} ・ P90: {hours(timeToMatch.matchPercentiles.p90)}（{timeToMatch.matchPercentiles.sampleSize}件）</p>
            )}
          </div>
          <div>
            <h3>初参加までの時間（パーセンタイル）</h3>
            {timeToMatch.firstJoinPercentiles.sampleSize === 0 ? <p className="muted">データ不足です。</p> : (
              <p>P25: {hours(timeToMatch.firstJoinPercentiles.p25)} ・ P50: {hours(timeToMatch.firstJoinPercentiles.p50)} ・ P75: {hours(timeToMatch.firstJoinPercentiles.p75)} ・ P90: {hours(timeToMatch.firstJoinPercentiles.p90)}（{timeToMatch.firstJoinPercentiles.sampleSize}件）</p>
            )}
          </div>
        </div>
        <div className="two-col">
          <div>
            <h3>エリア別 成立までの中央値時間（サンプル3件以上）</h3>
            {timeToMatch.areaStats.length === 0 ? <p className="muted">データ不足です。</p> : timeToMatch.areaStats.slice(0, 8).map(a => <p key={a.area}>{a.area}: {hours(a.medianHours)}（{a.sampleSize}件）</p>)}
          </div>
          <div>
            <h3>ジャンル別 成立までの中央値時間（サンプル3件以上）</h3>
            {timeToMatch.genreStats.length === 0 ? <p className="muted">データ不足です。</p> : timeToMatch.genreStats.slice(0, 8).map(g => <p key={g.genre}>{g.genre}: {hours(g.medianHours)}（{g.sampleSize}件）</p>)}
          </div>
        </div>
      </div>

      <div className="panel">
        <h2>登録ファネル</h2>
        <div className="analytics-grid">
          <div><strong>{data.signupStarted}</strong><span>登録開始</span></div>
          <div><strong>{data.signupCompleted}</strong><span>登録完了</span></div>
          <div><strong>{percent(data.signupConversionRate)}</strong><span>登録完了率</span></div>
          <div><strong>{data.joinIntentCreated}</strong><span>参加意図（未登録ユーザーの参加クリック）</span></div>
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
          <div><strong>{overview.referralActivatedUsers}</strong><span>紹介経由アクティブ化（累計）</span></div>
          <div><strong>{percent(overview.referralActivationRate)}</strong><span>アクティブ化率（登録済み紹介のうち）</span></div>
        </div>
      </div>

      <div className="panel">
        <h2>Quick Post</h2>
        <div className="analytics-grid">
          <div><strong>{data.quickPostStarted}</strong><span>Quick Post開始</span></div>
          <div><strong>{data.quickPostCompleted}</strong><span>Quick Post完了</span></div>
          <div><strong>{percent(data.quickPostCompletionRate)}</strong><span>完了率</span></div>
        </div>
      </div>

      <div className="panel">
        <h2>通知（in-app + メール）</h2>
        <p className="muted">通知回数が多いだけで成功扱いにはしていません。開封・クリック・種類別CVRで見てください。</p>
        <div className="analytics-grid">
          <div><strong>{notificationAnalysis.total}</strong><span>送信数</span></div>
          <div><strong>{notificationAnalysis.opened}</strong><span>開封数</span></div>
          <div><strong>{notificationAnalysis.clicked}</strong><span>クリック数</span></div>
          <div><strong>{percent(notificationAnalysis.openRate)}</strong><span>開封率</span></div>
          <div><strong>{percent(notificationAnalysis.clickRate)}</strong><span>クリック率（再訪率）</span></div>
        </div>
        {notificationAnalysis.byType.length > 0 && <div className="comparison-scroll"><table><thead><tr><th>種類</th><th>送信</th><th>開封</th><th>クリック</th><th>CVR</th></tr></thead><tbody>{notificationAnalysis.byType.map(t => <tr key={t.type}><td>{t.type}</td><td>{t.sent}</td><td>{t.opened}</td><td>{t.clicked}</td><td>{percent(t.clickRate)}</td></tr>)}</tbody></table></div>}
      </div>

      <div className="panel">
        <h2>Demand Intent</h2>
        <div className="analytics-grid">
          <div><strong>{demand.created}</strong><span>Demand Intent作成数</span></div>
          <div><strong>{demand.matched}</strong><span>Matched件数</span></div>
          <div><strong>{percent(demand.matchRate)}</strong><span>Demand Match Rate</span></div>
          <div><strong>{demand.recruitmentsCreated}</strong><span>Demandから作られた募集数</span></div>
          <div><strong>{demand.successfulFromDemand}</strong><span>Demandから成立した募集数</span></div>
        </div>
        <div className="two-col">
          <div><h3>エリア別需要</h3>{demand.byArea.length === 0 ? <p className="muted">データ不足です。</p> : demand.byArea.map(a => <p key={a.area}>{a.area}: {a.count}件</p>)}</div>
          <div><h3>ジャンル別需要</h3>{demand.byGenre.length === 0 ? <p className="muted">データ不足です。</p> : demand.byGenre.map(g => <p key={g.genre}>{g.genre}: {g.count}件</p>)}</div>
        </div>
      </div>

      <div className="panel">
        <h2>Supply / Demand Gap（過去30日、上位）</h2>
        <p className="muted">需要はあるが募集が少ないエリアほど上位に表示されます。より詳しいエリア×ジャンル分析は Business Dashboard を見てください。</p>
        {supplyGap.length === 0 ? <p className="muted">データ不足です。</p> : (
          <div className="comparison-scroll"><table><thead><tr><th>エリア</th><th>Demand Intent</th><th>募集数</th><th>成立率</th></tr></thead><tbody>{supplyGap.map(g => <tr key={g.area}><td>{g.area}</td><td>{g.demandIntents}</td><td>{g.activeMeals}</td><td>{percent(g.fillRate)}</td></tr>)}</tbody></table></div>
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
