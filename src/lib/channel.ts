export type Channel = 'Organic Search' | 'Direct' | 'X' | 'LINE' | 'Referral' | 'Area LP' | 'Meal Share' | 'Email' | 'Campaign' | 'Unknown';

// 流入元は説明可能なルールのみで分類する(機械学習は使わない)。優先順位: referral > utm_campaign > email > SNS > area LP > meal share > organic > direct。
export function classifyChannel(input: { source?: string | null; referrer?: string | null; utmMedium?: string | null; utmCampaign?: string | null; isReferral?: boolean }): Channel {
  if (input.isReferral) return 'Referral';
  const source = (input.source ?? '').toLowerCase();
  const referrer = (input.referrer ?? '').toLowerCase();
  const medium = (input.utmMedium ?? '').toLowerCase();
  if (medium === 'email' || source === 'email') return 'Email';
  if (input.utmCampaign || medium === 'campaign' || medium === 'cpc' || medium === 'paid') return 'Campaign';
  if (source === 'x' || source === 'twitter' || referrer.includes('x.com') || referrer.includes('twitter.com')) return 'X';
  if (source === 'line' || referrer.includes('line.me')) return 'LINE';
  if (source.startsWith('area_landing')) return 'Area LP';
  if (source === 'meal_share') return 'Meal Share';
  if (referrer.includes('google.') || referrer.includes('bing.') || referrer.includes('yahoo.')) return 'Organic Search';
  if (!source && !referrer) return 'Direct';
  return 'Unknown';
}
