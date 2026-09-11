// レース系テスト(同時クリック等)で、非同期のServer Action完了をUI要素の出現で待つのは信頼できない
// (Next.jsのroute announcer(#__next-route-announcer__)がrole="alert"を持つため、意図しない要素に
// 即座にマッチしてしまう)。代わりにDBの実際の状態を直接ポーリングして待つ。
export async function waitForCondition<T>(
  check: () => Promise<T>,
  predicate: (value: T) => boolean,
  { timeoutMs = 10_000, intervalMs = 250 }: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<T> {
  const start = Date.now();
  for (;;) {
    const value = await check();
    if (predicate(value)) return value;
    if (Date.now() - start > timeoutMs) return value;
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
}
