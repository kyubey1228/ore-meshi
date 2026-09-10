'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createRecruitmentFromDemandCluster } from '@/server/actions/demand-intent';
import { timeRangeLabel } from '@/lib/demand';
import { trackGrowthEvent } from '@/components/growth-tracker';

type Cluster = { area: string; genre: string | null; timeRange: string | null; count: number };

export function DemandClusterCard({ cluster }: { cluster: Cluster }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const router = useRouter();

  function createRecruitment() {
    setError('');
    start(async () => {
      const result = await createRecruitmentFromDemandCluster({ area: cluster.area, genre: cluster.genre ?? '', timeRange: cluster.timeRange ?? undefined, desiredGroupSize: Math.max(cluster.count, 2) });
      if (!result.ok || !result.href) { setError(result.message); return; }
      trackGrowthEvent('DEMAND_RECRUITMENT_CREATED', { area: cluster.area, foodCategory: cluster.genre ?? undefined, loggedIn: true });
      router.push(result.href);
    });
  }

  return (
    <article className="panel">
      <h3>{cluster.area} · {cluster.genre || 'ごはん全般'}</h3>
      <p className="muted">{timeRangeLabel(cluster.timeRange)}</p>
      <p className="last-slot-label">現在{cluster.count}人が行きたがっています</p>
      <button className="btn" type="button" disabled={pending} onClick={createRecruitment}>{pending ? '作成しています…' : `${cluster.count}人集まりました。募集を作りますか？`}</button>
      {error && <p role="alert" className="error">{error}</p>}
    </article>
  );
}
