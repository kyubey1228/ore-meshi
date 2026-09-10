export type ContentStudioAggregates = { weeklyCompleted: number; weeklyUniqueDiners: number; topArea: string | null; openMealsTopArea: { area: string; count: number } | null; highDemandCell: { area: string; genre: string; demandIntents: number; activeMeals: number } | null };
export type ContentIdea = { channel: 'X' | 'INSTAGRAM' | 'TIKTOK' | 'THREADS'; body: string };
export function generateContentIdeas(data: ContentStudioAggregates): ContentIdea[] {
  const ideas: ContentIdea[] = []; const min = 3;
  if (data.weeklyCompleted >= min) { const area = data.topArea ? `特に${data.topArea}が盛り上がっています。` : ''; ideas.push({ channel: 'X', body: `今週、${data.weeklyCompleted}件の食事が成立しました。のべ${data.weeklyUniqueDiners}人が参加。${area}\n\n#俺は誰かと飯が食いたい #ひとりじゃない飯` }, { channel: 'INSTAGRAM', body: `今週は${data.weeklyCompleted}件の「誰かと飯」が実現しました🍚\n${area}\n\n#俺は誰かと飯が食いたい #飯活 #ひとりごはんより誰かと` }); }
  if (data.openMealsTopArea) ideas.push({ channel: 'X', body: `今、${data.openMealsTopArea.area}で${data.openMealsTopArea.count}件の飯募集が進行中です。気になる募集に乗っかってみませんか？\n\n#俺は誰かと飯が食いたい` });
  if (data.highDemandCell) { const gap = data.highDemandCell.demandIntents - data.highDemandCell.activeMeals; ideas.push({ channel: 'X', body: `${data.highDemandCell.area}で${data.highDemandCell.genre}を探している人が増えています（募集より${gap}件多い需要）。お店の方はぜひ掲載してみてください。\n\n#俺は誰かと飯が食いたい` }, { channel: 'THREADS', body: `${data.highDemandCell.area}で${data.highDemandCell.genre}の「食事相手探してます」が増加中。近くのお店の方はチェックしてみてください。` }); }
  return ideas.slice(0, 6);
}
