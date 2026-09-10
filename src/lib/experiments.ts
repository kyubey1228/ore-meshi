function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function getVariant(experimentName: string, subjectId: string, variants: readonly string[]): string {
  if (variants.length === 0) return 'A';
  const index = hashString(`${experimentName}:${subjectId}`) % variants.length;
  return variants[index];
}

export const JOIN_CTA_COPY: Record<string, string> = {
  A: 'この募集に参加する',
  B: '無料で参加する',
  C: 'あと1席に参加する',
};
