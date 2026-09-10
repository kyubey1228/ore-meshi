import Link from 'next/link';
import { getAreaGenreDashboard, getOpportunityRanking, getSalesSummary, MIN_BUSINESS_SAMPLE_SIZE } from '@/server/business-intelligence';
import { getAcquisitionDashboard, getCampaignDashboard } from '@/server/acquisition';
import { getMonetizationSummary, getRetentionStats, getSponsorCompletionStats } from '@/server/monetization';
import { measurePerformance } from '@/lib/performance';

export const metadata = { title: 'Business Dashboard' };

const PERIODS = [7, 30, 90];

function percent(n: number) { return `${Math.round(n * 100)}%`; }

export default async function BusinessDashboard({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days: rawDays } = await searchParams;
  const days = PERIODS.includes(Number(rawDays)) ? Number(rawDays) : 30;
  const [areaGenre, opportunity, salesSummary, acquisition, campaigns, monetization, retention, sponsorCompletion] = await measurePerformance('ADMIN', 'business dashboard aggregates', () => Promise.all([
    getAreaGenreDashboard(days),
    getOpportunityRanking(days),
    getSalesSummary(days),
    getAcquisitionDashboard(days),
    getCampaignDashboard(days),
    getMonetizationSummary(days),
    getRetentionStats(days),
    getSponsorCompletionStats(days),
  ]));

  return (
    <section className="section">
      <div className="section-heading">
        <h1>Business Dashboard</h1>
        <div className="tag-pills">
          {PERIODS.map(p => <Link key={p} className={`tag-pill${days === p ? ' orange-pill' : ''}`} href={`/admin/business?days=${p}`}>{p}日間</Link>)}
        </div>
      </div>
      <div className="row wrap">
        <Link className="text-link" href="/admin/growth">Growth Dashboardへ →</Link>
        <Link className="text-link" href="/admin/leads">営業Lead管理へ →</Link>
        <Link className="text-link" href="/admin/business/campaigns">スポンサー施策管理へ →</Link>
      </div>
      <p className="muted">店舗営業・スポンサー営業に使えるデータのみを表示しています。個人のメールアドレス・食事履歴・個別のDemand Intent所有者は一切表示しません。n＜{MIN_BUSINESS_SAMPLE_SIZE}の集計は「データ不足」として抑制しています。</p>

      <div className="panel">
        <h2>収益サマリー（過去{days}日）</h2>
        <div className="analytics-grid">
          <div><strong>{monetization.sponsoredMealOrders}</strong><span>スポンサー飯 購入件数</span></div>
          <div><strong>{monetization.seatCampaignOrders}</strong><span>空席スポンサー 購入件数</span></div>
          <div><strong>{monetization.areaSponsorshipOrders}</strong><span>エリアスポンサー 購入件数</span></div>
          <div><strong>¥{Math.round(monetization.oneTimeRevenue).toLocaleString('ja-JP')}</strong><span>単発売上（スポンサー総売上）</span></div>
          <div><strong>{monetization.mrr === null ? 'データ不足' : `¥${Math.round(monetization.mrr).toLocaleString('ja-JP')}`}</strong><span>MRR（概算）</span></div>
          <div><strong>{monetization.subscriptionCounts.FREE}</strong><span>FREEプラン（概算）</span></div>
          <div><strong>{monetization.subscriptionCounts.STANDARD}</strong><span>STANDARDプラン</span></div>
          <div><strong>{monetization.subscriptionCounts.PRO}</strong><span>PROプラン</span></div>
          <div><strong>{monetization.checkoutStarted}</strong><span>Checkout開始</span></div>
          <div><strong>{monetization.checkoutCompleted}</strong><span>Checkout完了</span></div>
          <div><strong>{percent(monetization.checkoutConversionRate)}</strong><span>Checkout Conversion Rate</span></div>
        </div>
        <p className="muted">MRRはキャッシュ済みのStripe価格 × 有効なSTANDARD/PRO契約数の概算値です（日割り・管理者による手動プラン付与は考慮していません）。FREEプラン数は有効な店舗数からSTANDARD/PRO契約数を差し引いた概算値です。単発売上はSponsorOrder（決済確定済みのみ）の実額合計で、Stripe APIを毎回呼び出さずDB内の記録から算出しています。</p>
      </div>

      <div className="panel">
        <h2>収益 North Star（過去{days}日）</h2>
        <p className="muted">スポンサー飯5,000円は広告表示ではなく、実際のMeal成立・開催確認まで追跡します。MatchedとCompletedは別概念です。</p>
        <div className="analytics-grid">
          <div><strong>{sponsorCompletion.completedMeals}</strong><span>Sponsor Completed Meals</span></div>
          <div><strong>{sponsorCompletion.completedParticipants}</strong><span>Sponsor Completed Participants</span></div>
          <div><strong>{sponsorCompletion.matchedMeals}</strong><span>Sponsor Matched Meals</span></div>
          <div><strong>{retention.payingBusinessAccounts}</strong><span>Paying Business Accounts</span></div>
          <div><strong>{retention.repeatBuyers}</strong><span>Repeat Sponsor Purchases（店舗数）</span></div>
          <div><strong>{monetization.mrr === null ? 'データ不足' : `¥${Math.round(monetization.mrr).toLocaleString('ja-JP')}`}</strong><span>MRR</span></div>
        </div>
      </div>

      <div className="panel">
        <h2>Business Retention（過去{days}日）</h2>
        <div className="analytics-grid">
          <div><strong>{retention.newPayingBusinessAccounts}</strong><span>New Paying Businesses</span></div>
          <div><strong>{retention.repeatBuyers}</strong><span>Repeat Buyers（単発商品2回以上）</span></div>
          <div><strong>{percent(retention.repeatPurchaseRate)}</strong><span>Repeat Purchase Rate</span></div>
          <div><strong>{percent(retention.sponsoredMealRepeatRate)}</strong><span>Sponsored Meal Repeat Rate</span></div>
          <div><strong>{percent(retention.seatCampaignRepeatRate)}</strong><span>Seat Campaign Repeat Rate</span></div>
          <div><strong>{monetization.subscriptionCounts.FREE ? percent(monetization.subscriptionCounts.STANDARD / (monetization.subscriptionCounts.FREE + monetization.subscriptionCounts.STANDARD)) : 'データ不足'}</strong><span>Subscription Conversion（FREE→STANDARD、概算）</span></div>
        </div>
        <p className="muted">Repeat Buyerは期間内にPAID状態の単発スポンサー商品(スポンサー飯/空席スポンサー/エリアスポンサー)を2回以上購入したBusinessです。Subscription ConversionはFREE/STANDARDの現在の店舗数比率からの概算で、実際の遷移イベント履歴ではありません。</p>
      </div>

      <div className="panel">
        <h2>集客Overview</h2>
        <div className="analytics-grid">
          <div><strong>{acquisition.totals.siteVisitors}</strong><span>Site Visitors（セッション数の近似値）</span></div>
          <div><strong>{acquisition.totals.signupStarted}</strong><span>Signup Started</span></div>
          <div><strong>{acquisition.totals.signupCompleted}</strong><span>Signup Completed</span></div>
          <div><strong>{acquisition.totals.activatedUsers}</strong><span>Activated Users</span></div>
          <div><strong>{acquisition.totals.matchedUsers}</strong><span>Matched Users</span></div>
          <div><strong>{acquisition.totals.completedUsers}</strong><span>Completed Users</span></div>
          <div><strong>{percent(acquisition.signupCvr)}</strong><span>Signup CVR</span></div>
          <div><strong>{percent(acquisition.activationCvr)}</strong><span>Activation CVR</span></div>
          <div><strong>{percent(acquisition.completedCvr)}</strong><span>Completed CVR</span></div>
        </div>
        {acquisition.bestActivatedChannel && <p className="muted">最もActivation CVRが高いチャネル（サンプル5件以上）: {acquisition.bestActivatedChannel.channel}（{percent(acquisition.bestActivatedChannel.signupCvr)}）</p>}
      </div>

      <div className="panel">
        <div className="row between wrap"><h2>Acquisition Channels</h2><a className="text-link" href={`/api/admin/export/acquisition?days=${days}`}>CSVダウンロード</a></div>
        <p className="muted">登録を多く生むチャネルと、実際に成立まで至るチャネルは別物です。両方を見てください。</p>
        <div className="comparison-scroll"><table><thead><tr><th>Channel</th><th>Visits</th><th>Signup</th><th>Activated</th><th>Matched</th><th>Completed</th><th>Signup CVR</th><th>Completed CVR</th></tr></thead><tbody>
          {acquisition.channels.map(c => <tr key={c.channel}><td>{c.channel}</td><td>—</td><td>{c.signup}</td><td>{c.activated}</td><td>{c.matched}</td><td>{c.completed}</td><td>{percent(c.signupCvr)}</td><td>{percent(c.completedCvr)}</td></tr>)}
        </tbody></table></div>
      </div>

      <div className="panel">
        <div className="row between wrap"><h2>Campaign Dashboard（UTM campaign別）</h2><a className="text-link" href={`/api/admin/export/campaigns?days=${days}`}>CSVダウンロード</a></div>
        {campaigns.length === 0 ? <p className="muted">この期間、utm_campaign付きの流入はありませんでした。</p> : (
          <div className="comparison-scroll"><table><thead><tr><th>Campaign</th><th>Visits</th><th>Signup</th><th>Activated</th><th>Matched</th><th>Completed</th><th>Conversion</th></tr></thead><tbody>
            {campaigns.map(c => <tr key={c.campaign}><td>{c.campaign}</td><td>{c.visits}</td><td>{c.signup}</td><td>{c.activated}</td><td>{c.matched}</td><td>{c.completed}</td><td>{percent(c.conversionRate)}</td></tr>)}
          </tbody></table></div>
        )}
      </div>

      <div className="panel">
        <h2>営業向けサマリー（過去{days}日）</h2>
        <p className="muted">店舗へ「このエリアでこれだけ需要があります」と説明する際にそのまま使える文面です。推定参加者数は成立時点の募集人数の合計であり実測の出席者数ではないため「推定」です。</p>
        {salesSummary.length === 0 ? <p className="muted">データ不足です。</p> : salesSummary.map(s => (
          <div key={`${s.area}-${s.genre}`} className="list-card">
            <strong>{s.text}</strong>
            <span>前期間比: Demand {s.demandChangePct === null ? 'データ不足' : `${s.demandChangePct >= 0 ? '+' : ''}${s.demandChangePct}%`} ・ Completed {s.completedChangePct === null ? 'データ不足' : `${s.completedChangePct >= 0 ? '+' : ''}${s.completedChangePct}%`}</span>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="row between wrap"><h2>店舗向け営業候補ランキング（Opportunity Score）</h2><a className="text-link" href={`/api/admin/export/opportunity?days=${days}`}>CSVダウンロード</a></div>
        <p className="muted">Opportunity Score = 需要件数 ＋ 供給不足分（需要−募集数、不足のみ）×2 ＋ 過去の成立実績×1。複雑なAIモデルは使っていません。</p>
        {opportunity.length === 0 ? <p className="muted">データ不足です。</p> : (
          <div className="comparison-scroll"><table><thead><tr><th>Area × Genre</th><th>Demand</th><th>Active Meals</th><th>Completed</th><th>Fill Rate</th><th>Opportunity</th></tr></thead><tbody>
            {opportunity.map(o => <tr key={`${o.area}-${o.genre}`}><td>{o.area} × {o.genre}</td><td>{o.demandIntents}</td><td>{o.activeMeals}</td><td>{o.completedMeals}</td><td>{percent(o.fillRate)}</td><td>{o.opportunityScore.toFixed(1)}</td></tr>)}
          </tbody></table></div>
        )}
      </div>

      <div className="panel">
        <div className="row between wrap"><h2>Area × Genre Heatmap（表形式）</h2><a className="text-link" href={`/api/admin/export/area-genre?days=${days}`}>CSVダウンロード</a></div>
        <p className="muted">Demand Intent数 / Active Meals / Completed Meals の順で表示。データ不足の組み合わせは非表示です。</p>
        <div className="comparison-scroll"><table><thead><tr><th>Area</th><th>Genre</th><th>Demand</th><th>Active</th><th>Matched</th><th>Completed</th><th>Fill Rate</th><th>推定参加者</th></tr></thead><tbody>
          {areaGenre.cells.filter(c => c.dataSufficient).sort((a, b) => b.demandIntents - a.demandIntents).slice(0, 40).map(c => (
            <tr key={`${c.area}-${c.genre}`}><td>{c.area}</td><td>{c.genre}</td><td>{c.demandIntents}</td><td>{c.activeMeals}</td><td>{c.matchedMeals}</td><td>{c.completedMeals}</td><td>{percent(c.fillRate)}</td><td>{c.estimatedParticipants}（推定）</td></tr>
          ))}
        </tbody></table></div>
      </div>

      <div className="panel">
        <h2>用語の定義</h2>
        <p className="muted">Demand：ユーザーが登録した「行きたい」条件の件数。Active Meal：期間内に作成された募集数。Matched Meal：必要人数に到達した募集数。Completed Meal：実際に開催が確認された数（Matchedとは別概念）。Participant：確定した参加人数。推定参加者数：成立時点の募集人数の合計であり実測ではありません。Opportunity Score：需要・供給不足・実績から算出する説明可能な指標で、AI予測ではありません。Demand/Supply Ratio：Demand Intent数 ÷ Active Meals数。</p>
      </div>
    </section>
  );
}
