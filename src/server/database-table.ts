import 'server-only';
import { Prisma } from '@prisma/client';

// Transaction poolers do not guarantee a session search_path. Qualify every raw
// SQL table explicitly, including isolated test schemas, just like Prisma does.
export function databaseTable(name: 'Match' | 'MatchParticipant' | 'MatchChatMessage' | 'Meal' | 'User' | 'UserDiningType' | 'DiningType' | 'MealCandidate' | 'MealPurposeRelation' | 'MealPurpose' | 'JoinRequest' | 'SponsoredMeal' | 'BusinessAccount' | 'BusinessSubscription' | 'SeatCampaign' | 'AreaOption') {
  const schema = new URL(process.env.DATABASE_URL!).searchParams.get('schema') || 'public';
  return Prisma.raw(`"${schema.replaceAll('"', '""')}"."${name}"`);
}
