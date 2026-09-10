export const SEO_MIN_AGGREGATE_SAMPLE = 3;
export type SeoQualityInput = { meals30d: number; demand30d: number; completed30d: number; hasGenreMetadata: boolean };
export function isGenreSeoIndexable(input: SeoQualityInput) {
  if (!input.hasGenreMetadata) return false;
  return input.meals30d >= SEO_MIN_AGGREGATE_SAMPLE || input.demand30d >= SEO_MIN_AGGREGATE_SAMPLE || input.completed30d >= SEO_MIN_AGGREGATE_SAMPLE;
}
