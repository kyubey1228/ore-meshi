import { currentUserId } from '@/server/auth';
import { getDemandClusters, getMyDemandIntents } from '@/server/demand';
import { timeRangeLabel } from '@/lib/demand';
import { DemandIntentForm } from '@/components/demand-intent-form';
import { DemandClusterCard } from '@/components/demand-cluster-card';
import { ActionForm } from '@/components/action-form';
import { cancelDemandIntent } from '@/server/actions/demand-intent';
import { GrowthTracker } from '@/components/growth-tracker';

export const metadata = { title: '行きたい登録' };

export default async function DemandPage() {
  const userId = await currentUserId();
  const [clusters, myIntents] = await Promise.all([
    getDemandClusters(),
    userId ? getMyDemandIntents() : Promise.resolve([]),
  ]);

  return (
    <section className="section narrow">
      <GrowthTracker eventType="DEMAND_CLUSTER_VIEWED" loggedIn={Boolean(userId)} />
      <span className="eyebrow orange">DEMAND</span>
      <h1>まだ募集が無くても、食べたい気持ちだけ登録できる。</h1>
      <p className="muted">同じ条件の人が集まったら、募集を作るチャンスをお知らせします。</p>

      {userId ? <DemandIntentForm /> : (
        <div className="notice">行きたい登録にはログインが必要です。<a className="text-link" href={`/login?next=${encodeURIComponent('/demand')}`}>ログインする</a></div>
      )}

      {myIntents.length > 0 && (
        <div className="panel">
          <h2>あなたの行きたい登録</h2>
          {myIntents.map(intent => (
            <div className="list-card" key={intent.id}>
              <strong>{intent.area} · {intent.genre || 'ごはん全般'}</strong>
              <span>{timeRangeLabel(intent.timeRange)} · 希望{intent.desiredGroupSize}人</span>
              <ActionForm label="取り消す" action={() => cancelDemandIntent(intent.id)} />
            </div>
          ))}
        </div>
      )}

      <div className="section-heading"><h2>今、集まっている需要</h2></div>
      {clusters.length === 0
        ? <div className="empty"><span className="empty-icon">🍚</span><p>まだ十分なデータがありません。あなたが最初の一人になりませんか？</p></div>
        : clusters.map(cluster => <DemandClusterCard key={`${cluster.area}-${cluster.genre}-${cluster.timeRange}`} cluster={cluster} />)}
    </section>
  );
}
