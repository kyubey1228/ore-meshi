import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentBusinessMembership } from '@/server/business';
import { getBusinessDemandIntelligence } from '@/server/business-demand';
import { MIN_BUSINESS_SAMPLE_SIZE } from '@/server/business-intelligence';

export const metadata = { title: 'Demand Intelligence' };

function percent(n: number) { return `${Math.round(n * 100)}%`; }

export default async function BusinessDemandPage() {
  const membership = await currentBusinessMembership();
  if (!membership) redirect('/business/onboarding');
  const data = await getBusinessDemandIntelligence(membership.businessAccountId, 30);

  return (
    <section className="section">
      <Link className="text-link" href="/business/dashboard">← Business Dashboard</Link>
      <h1>Demand Intelligence</h1>
      <p className="muted">「どのエリア・ジャンルにユーザーの需要があるか」を確認できます。n＜{MIN_BUSINESS_SAMPLE_SIZE}の集計は「データ不足」として表示しません。個人のデータは一切含まれません。</p>

      {data.tier === 'SUMMARY' && (
        <div className="panel">
          <h2>概要（FREEプラン）</h2>
          {data.top.length === 0 ? <p className="muted">データ不足です。</p> : data.top.map(c => (
            <div className="list-card" key={`${c.area}-${c.genre}`}><strong>{c.area} × {c.genre}</strong><span>需要{c.demandIntents}件 ・ 募集{c.activeMeals}件</span></div>
          ))}
          <p className="muted">エリア×ジャンルの詳細な表や成立率はSTANDARD以上でご覧いただけます。</p>
          <Link className="btn secondary small" href="/business/billing">プランを見る →</Link>
        </div>
      )}

      {data.tier !== 'SUMMARY' && (
        <div className="panel">
          <h2>エリア×ジャンル詳細</h2>
          <div className="comparison-scroll"><table><thead><tr><th>Area</th><th>Genre</th><th>Demand</th><th>Active Meals</th><th>Matched</th><th>Completed</th><th>Fill Rate</th></tr></thead><tbody>
            {data.table.map(c => <tr key={`${c.area}-${c.genre}`}><td>{c.area}</td><td>{c.genre}</td><td>{c.demandIntents}</td><td>{c.activeMeals}</td><td>{c.matchedMeals}</td><td>{c.completedMeals}</td><td>{percent(c.fillRate)}</td></tr>)}
          </tbody></table></div>
        </div>
      )}

      {data.tier === 'ADVANCED' && (
        <div className="panel">
          <h2>Opportunity比較（PROプラン）</h2>
          <p className="muted">需要・供給不足・成立実績から算出した説明可能な指標です（AI予測ではありません）。</p>
          <div className="comparison-scroll"><table><thead><tr><th>Area × Genre</th><th>Opportunity Score</th><th>Fill Rate</th></tr></thead><tbody>
            {data.comparison.map(c => <tr key={`${c.area}-${c.genre}`}><td>{c.area} × {c.genre}</td><td>{c.opportunityScore.toFixed(1)}</td><td>{percent(c.fillRate)}</td></tr>)}
          </tbody></table></div>
        </div>
      )}
    </section>
  );
}
