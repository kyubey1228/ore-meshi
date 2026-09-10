'use client';
import { useState } from 'react';
import { ActionForm } from '@/components/action-form';
import { TagSelector } from '@/components/tag-selector';
import { completeOnboarding } from '@/server/actions/onboarding';

const GENRES = ['ラーメン','焼肉','寿司','カレー','中華','居酒屋','カフェ','その他'].map(label => ({ id: label, slug: label, label }));

export function OnboardingForm() {
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <div className="panel">
      <ActionForm label="この条件で募集を見る" action={data => completeOnboarding({ preferredArea: data.get('preferredArea'), preferredGenres: selected })}>
        <label>よく使うエリア（任意）<input name="preferredArea" placeholder="例：新宿" maxLength={80} /></label>
        <div className="field-group">
          <strong>食べたいジャンル（任意）</strong>
          <p className="muted">最大5個まで選べます。</p>
          <TagSelector tags={GENRES} selected={selected} onChange={setSelected} max={5} label="食べたいジャンルを選択" />
        </div>
      </ActionForm>
      <div className="skip-action">
        <ActionForm label="スキップして飯を探す" action={() => completeOnboarding({ skipped: true })} />
      </div>
    </div>
  );
}
