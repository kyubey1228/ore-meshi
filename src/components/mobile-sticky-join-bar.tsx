'use client';

type Props = { area: string; when: string; remaining: number; participantCount: number };

export function MobileStickyJoinBar({ area, when, remaining, participantCount }: Props) {
  function scrollToJoin() {
    const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('join-panel')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }
  return (
    <div className="meal-sticky-cta">
      <div className="meal-sticky-info">
        <strong>{area}</strong>
        <span>{when} · {participantCount}人参加 · あと{remaining}人</span>
      </div>
      <button className="btn small" type="button" onClick={scrollToJoin}>参加する</button>
    </div>
  );
}
