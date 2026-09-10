import Link from 'next/link';

export function BusinessEmptyState({ icon, message, ctaHref, ctaLabel }: { icon: string; message: string; ctaHref?: string; ctaLabel?: string }) {
  return (
    <div className="empty">
      <span className="empty-icon">{icon}</span>
      <p>{message}</p>
      {ctaHref && ctaLabel && <Link className="btn" href={ctaHref}>{ctaLabel}</Link>}
    </div>
  );
}
