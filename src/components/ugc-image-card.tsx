import type { CSSProperties, ReactNode } from 'react';
import type { getUgcStyle } from '@/lib/ugc';

type Style = ReturnType<typeof getUgcStyle>;

const textShadow = '0 2px 8px rgba(0,0,0,.55)';

export function UgcImageCard({ background, style, badge, title, children, action }: {
  background: string;
  style: Style;
  badge: string;
  title: ReactNode;
  children: ReactNode;
  action: string;
}) {
  return <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', overflow: 'hidden', background: '#211d19', fontFamily: 'sans-serif' }}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={background} alt="" width="1200" height="630" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
    <div style={{ position: 'absolute', inset: 0, display: 'flex', background: 'linear-gradient(180deg, rgba(16,12,9,.08) 20%, rgba(16,12,9,.88) 100%)' }} />
    <div style={{ position: 'absolute', top: 34, left: 40, display: 'flex', padding: '10px 18px', color: '#fff', background: style.accent, border: '3px solid #fff', borderRadius: 999, fontSize: 23, fontWeight: 900, boxShadow: '0 4px 0 rgba(0,0,0,.3)' }}>🍚 俺は誰かと飯が食いたい！</div>
    <div style={{ position: 'absolute', left: 40, right: 40, bottom: 34, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 28 }}>
      <div style={{ width: '78%', display: 'flex', flexDirection: 'column', padding: '24px 28px', color: '#fff', background: 'rgba(24,19,15,.78)', borderLeft: `10px solid ${style.accent}`, borderRadius: 14, boxShadow: '0 8px 24px rgba(0,0,0,.35)' }}>
        <div style={{ display: 'flex', color: '#fff', fontSize: 31, fontWeight: 900, textShadow }}>{badge}</div>
        <div style={{ display: 'flex', marginTop: 8, color: '#fff', fontSize: 48, lineHeight: 1.08, fontWeight: 900, letterSpacing: '-0.035em', textShadow }}>{title}</div>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 14, color: '#fff', fontSize: 23, lineHeight: 1.32, fontWeight: 800, textShadow } as CSSProperties}>{children}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', color: '#fff', fontSize: 22, fontWeight: 900, textShadow }}><span>#誰か飯いこ</span><span style={{ marginTop: 8 }}>{action} →</span></div>
    </div>
  </div>;
}
