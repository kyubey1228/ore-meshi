type CandidateTime = { date: Date; startTime: string };

export function candidateStartInstant(candidate: CandidateTime): Date {
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' });
  const parts = Object.fromEntries(fmt.formatToParts(candidate.date).map(part => [part.type, part.value]));
  return new Date(`${parts.year}-${parts.month}-${parts.day}T${candidate.startTime}:00+09:00`);
}

export function shouldAutoCloseMeal(candidates: CandidateTime[], now = new Date()) {
  return candidates.length > 0 && candidates.every(candidate => candidateStartInstant(candidate) <= now);
}
