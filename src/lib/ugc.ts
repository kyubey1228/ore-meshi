export const UGC_STYLES = [
  { id: 'gag', label: '腹ペコ絶叫', description: '勢いで誰かを呼ぶ王道ギャグ', image: '/ugc/gag-callout-v2.jpg', accent: '#f05a28', restricted: false },
  { id: 'deadpan', label: 'ひとり二杯', description: '空席を見つめるシュール漫画', image: '/ugc/deadpan-wait.jpg', accent: '#176b72', restricted: false },
  { id: 'victory', label: '飯、決まった！', description: '集まった喜びを全力で祝う', image: '/ugc/victory-feast.jpg', accent: '#d94b28', restricted: false },
  { id: 'woman', label: '女子から飯コール', description: '明るい女性主人公の呼びかけ', image: '/ugc/woman-callout.jpg', accent: '#db5275', restricted: false },
  { id: 'mixer', label: '街コン飯', description: 'みんなで盛り上がる街コン風', image: '/ugc/mixer-night.jpg', accent: '#7546b8', restricted: false },
  { id: 'women-only', label: '女子会・男性参加不可', description: '女性限定の募集にだけ使う', image: '/ugc/women-only.jpg', accent: '#d92f72', restricted: true },
  { id: 'men-only', label: '漢飯・女性参加不可', description: '男性限定の募集にだけ使う', image: '/ugc/men-only.jpg', accent: '#a3261d', restricted: true },
] as const;

export type UgcStyle = typeof UGC_STYLES[number]['id'];

export const DEFAULT_UGC_STYLE: UgcStyle = 'gag';
export const RANDOM_UGC_STYLES = UGC_STYLES.filter(style => !style.restricted);

export function isUgcStyle(value: unknown): value is UgcStyle {
  return typeof value === 'string' && UGC_STYLES.some(style => style.id === value);
}

export function getUgcStyle(value: unknown) {
  return UGC_STYLES.find(style => style.id === value) ?? UGC_STYLES[0];
}

export function initialUgcStyle(seed: string): UgcStyle {
  const hash = [...seed].reduce((total, character) => total + character.charCodeAt(0), 0);
  return RANDOM_UGC_STYLES[hash % RANDOM_UGC_STYLES.length].id;
}

export function withUgcStyle(url: string, style: UgcStyle, mealId?: string) {
  const parsed = new URL(url);
  parsed.searchParams.set('ugc_style', style);
  if (mealId) parsed.searchParams.set('meal', mealId);
  return parsed.toString();
}
