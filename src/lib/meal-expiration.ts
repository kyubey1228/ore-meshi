import type { MealStatus } from '@prisma/client';

type CandidateTime = { date: Date; startTime: string };

export function candidateStartInstant(candidate: CandidateTime): Date {
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' });
  const parts = Object.fromEntries(fmt.formatToParts(candidate.date).map(part => [part.type, part.value]));
  return new Date(`${parts.year}-${parts.month}-${parts.day}T${candidate.startTime}:00+09:00`);
}

export function shouldAutoCloseMeal(candidates: CandidateTime[], now = new Date()) {
  return candidates.length > 0 && candidates.every(candidate => candidateStartInstant(candidate) <= now);
}

// DB上のstatusは/api/cron/notifications実行時にしかOPEN→CLOSEDへ更新されないため、
// cron実行までのタイムラグの間は候補日を過ぎてもOPENのまま残る。表示・参加可否の判定は
// 常にこの実質ステータスを使い、DBのstatus更新を待たずに「募集終了」を反映する。
export function effectiveMealStatus(meal: { status: MealStatus; candidates: CandidateTime[] }, now = new Date()): MealStatus {
  return meal.status === 'OPEN' && shouldAutoCloseMeal(meal.candidates, now) ? 'CLOSED' : meal.status;
}
