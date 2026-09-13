'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MealShareActions } from '@/components/meal-share-actions';
import { mealUrl } from '@/lib/social';

export type CreatedMeal = { href: string; mealId: string; title: string; area: string; genre: string; when: string; budget: string; payment: string; remaining: number; purposeLabels: string[] };

export function MealCreatedDialog({ meal, onContinue }: { meal: CreatedMeal; onContinue: () => void }) {
  return <Dialog open onOpenChange={open => { if (!open) onContinue(); }}>
    <DialogContent showCloseButton={false} className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>募集を作成しました！</DialogTitle>
        <DialogDescription>シェアすると、一緒に行ける人が見つかりやすくなります。</DialogDescription>
      </DialogHeader>
      <MealShareActions
        mealId={meal.mealId}
        area={meal.area}
        genre={meal.genre || null}
        url={mealUrl(meal.mealId)}
        text={['誰か飯いこ', '', meal.when, `${meal.area}で${meal.title}`, '', `${meal.budget} / ${meal.payment} / あと${meal.remaining}人`, meal.purposeLabels.map(label => `#${label.replace(/\s/g, '')}`).join(' '), '', '#誰か飯いこ', mealUrl(meal.mealId)].filter((line, index, all) => line !== '' || all[index - 1] !== '').join('\n')}
      />
      <DialogFooter>
        <button type="button" className="btn secondary" onClick={onContinue}>あとで・募集ページへ</button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
