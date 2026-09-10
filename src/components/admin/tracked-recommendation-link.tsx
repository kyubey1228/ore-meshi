'use client';
import Link from 'next/link';

export function TrackedRecommendationLink({ href, label, category, action }: { href: string; label: string; category: string; action: (category: string) => Promise<void> }) {
  return (
    <Link className="text-link" href={href} onClick={() => { action(category).catch(() => {}); }}>
      {label} →
    </Link>
  );
}
