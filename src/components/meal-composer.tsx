'use client';

import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';
import { QuickPostForm } from '@/components/quick-post-form';
import type { MealForm as DetailedForm } from '@/components/meal-form';

// 簡単投稿ではカレンダー・詳細入力用のライブラリを読み込まない。
const MealForm = dynamic(() => import('@/components/meal-form').then(module => module.MealForm), {
  loading: () => <div className="panel" role="status">募集フォームを読み込んでいます…</div>,
});

type Props = ComponentProps<typeof QuickPostForm> & {
  detailed: boolean;
  purposes: ComponentProps<typeof DetailedForm>['purposes'];
};

export function MealComposer({ detailed, purposes, ...quickProps }: Props) {
  return detailed
    ? <MealForm purposes={purposes} areaOptions={quickProps.areaOptions} />
    : <QuickPostForm {...quickProps} />;
}
