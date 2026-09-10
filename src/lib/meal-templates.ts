export type MealTemplate = { id: string; label: string; title: string; genre: string; description: string };

// 将来的にDB管理へ移行しやすいよう、単純な配列として定義しておく。
export const MEAL_TEMPLATES: MealTemplate[] = [
  { id: 'yakiniku', label: '焼肉行きたい', title: '焼肉行ける人募集！', genre: '焼肉', description: '今日焼肉行きたい気分です。気軽に来てください。' },
  { id: 'ramen', label: 'ラーメン食べたい', title: 'ラーメン一緒に行きませんか', genre: 'ラーメン', description: '無性にラーメンが食べたくなったので誰か一緒にどうですか。' },
  { id: 'after-work', label: '仕事終わりに軽く飲みたい', title: '仕事終わりに軽く飲みませんか', genre: '居酒屋', description: '仕事終わりにサクッと一杯どうですか。' },
  { id: 'hard-to-enter', label: '一人で入りづらい店に行きたい', title: '一人だと入りづらい店、一緒に行きませんか', genre: 'その他', description: 'ずっと気になってるお店、一人だと入りづらいので誰か一緒に。' },
  { id: 'lunch', label: 'ランチ行きたい', title: 'ランチ一緒にどうですか', genre: 'その他', description: 'お昼、気軽にランチ行きませんか。' },
  { id: 'cafe', label: 'カフェ行きたい', title: 'カフェで一息つきませんか', genre: 'カフェ', description: 'まったりカフェで話しませんか。' },
  { id: 'today', label: '今日誰かと飯食いたい', title: '今日誰かと飯食いたい', genre: 'その他', description: '今日、誰かと飯食いませんか。理由は特にないです。' },
];
