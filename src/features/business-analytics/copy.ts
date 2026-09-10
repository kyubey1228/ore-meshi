export function describeMonthlyReach(xVisits: number): string {
  return xVisits > 0 ? `今月、俺メシ経由で${xVisits}人に届きました。` : '今月はまだXからのアクセスがありません。';
}

export function describeMealsClosed(matched: number): string {
  return matched > 0 ? `${matched}件の飯が成立しました。` : 'まだ成立した飯はありません。';
}

export function describeReferrals(joinRequests: number): string {
  return joinRequests > 0 ? `推定${joinRequests}人が来店につながりました。` : '送客はまだありません。';
}

export function describeCouponRedemptions(count: number): string {
  return count > 0 ? `クーポンが${count}回使われました。` : 'クーポン利用の記録機能は今後追加予定です。';
}
