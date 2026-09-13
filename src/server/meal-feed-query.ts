import 'server-only';
import { Prisma } from '@prisma/client';
import type { z } from 'zod';
import type { filterSchema } from '@/validators';
import { prisma } from '@/lib/prisma';
import { databaseJsonDate, type DatabaseJson } from '@/lib/database-json';
import { databaseTable } from '@/server/database-table';

export const publicUserSelect = { id:true, twitterUsername:true, displayName:true, image:true, bio:true, createdAt:true,diningTypes:{where:{diningType:{isActive:true}},orderBy:{diningType:{sortOrder:'asc'}},select:{diningType:{select:{id:true,slug:true,label:true}}}} } satisfies Prisma.UserSelect;
export type MealListFilters = Partial<z.infer<typeof filterSchema>>;
type MealRow = Prisma.MealGetPayload<{include:{
  host:{select:typeof publicUserSelect}; candidates:true;
  purposes:{select:{purpose:{select:{id:true;slug:true;label:true}}}};
  _count:{select:{candidates:true;joinRequests:true}};
  sponsoredMeals:{select:{sponsorName:true;benefit:true;businessAccount:{select:{planOverride:true;subscription:{select:{plan:true;status:true;currentPeriodEnd:true}}}}}};
}}>;
type JsonRelations = 'host' | 'candidates' | 'purposes' | '_count' | 'sponsoredMeals';
type QueryRow = Omit<MealRow, JsonRelations> & DatabaseJson<Pick<MealRow, JsonRelations>>;
export type JsonMealRow = DatabaseJson<MealRow>;

export function isDefaultMealQuery(filters: MealListFilters) {
  return !filters.area && !filters.date && !filters.paymentType && !filters.purpose && !filters.when && !filters.remaining && typeof filters.budget !== 'number';
}

function candidateWindows(when: string | undefined, now: Date) {
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + 1);
  type Window = { date: { gte: Date; lt: Date }; startTime?: { gte?: string; lte?: string } };
  if (when === 'today') return [{ date: { gte: start, lt: end } }] satisfies Window[];
  if (when === 'tonight') return [{ date: { gte: start, lt: end }, startTime: { gte: '18:00' } }] satisfies Window[];
  if (when !== 'soon') return [] as Window[];
  const until = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const time = (date: Date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  const from = new Date(Math.ceil(now.getTime() / 60_000) * 60_000);
  const nextEnd = new Date(end); nextEnd.setDate(nextEnd.getDate() + 1);
  if (from >= end) return [{ date: { gte: end, lt: nextEnd }, startTime: { gte: time(from), lte: time(until) } }] satisfies Window[];
  if (until < end) return [{ date: { gte: start, lt: end }, startTime: { gte: time(from), lte: time(until) } }] satisfies Window[];
  return [{ date: { gte: start, lt: end }, startTime: { gte: time(from) } }, { date: { gte: end, lt: nextEnd }, startTime: { lte: time(until) } }] satisfies Window[];
}

// No request APIs or framework cache: usable both during server readiness and requests.
export function buildOpenMealsQuery(filters: MealListFilters, limit: number, skip = 0, now = new Date()) {
  const windows = candidateWindows(filters.when, now);
    // All values are bound parameters. Filter and LIMIT the base rows before
    // fetching their public relations, in one SQL statement for every page.
    const clauses = [Prisma.sql`m.status = 'OPEN'`, Prisma.sql`(m.deadline IS NULL OR m.deadline > ${now})`];
    if (filters.remaining) clauses.push(Prisma.sql`m."maxParticipants" - 1 - (SELECT count(*) FROM ${databaseTable('JoinRequest')} j WHERE j."mealId" = m.id AND j.status = 'ACCEPTED') = ${Number(filters.remaining)}`);
    if (filters.area) clauses.push(Prisma.sql`m.area ILIKE ${`%${filters.area}%`}`);
    if (filters.paymentType) clauses.push(Prisma.sql`m."paymentType"::text = ${filters.paymentType}`);
    if (typeof filters.budget === 'number') clauses.push(Prisma.sql`m."budgetMax" <= ${filters.budget}`);
    if (filters.purpose) clauses.push(Prisma.sql`EXISTS (SELECT 1 FROM ${databaseTable('MealPurposeRelation')} mp JOIN ${databaseTable('MealPurpose')} p ON p.id = mp."purposeId" WHERE mp."mealId" = m.id AND p."isActive" AND p.slug = ${filters.purpose})`);
    if (filters.date) clauses.push(Prisma.sql`EXISTS (SELECT 1 FROM ${databaseTable('MealCandidate')} c WHERE c."mealId" = m.id AND c.date = ${new Date(filters.date)})`);
    if (windows.length) {
      const ranges = windows.map(window => {
        const times = window.startTime as { gte?: string; lte?: string } | undefined;
        const terms = [Prisma.sql`c.date >= ${window.date.gte}`, Prisma.sql`c.date < ${window.date.lt}`];
        if (times?.gte) terms.push(Prisma.sql`c."startTime" >= ${times.gte}`);
        if (times?.lte) terms.push(Prisma.sql`c."startTime" <= ${times.lte}`);
        return Prisma.sql`(${Prisma.join(terms, ' AND ')})`;
      });
      clauses.push(Prisma.sql`EXISTS (SELECT 1 FROM ${databaseTable('MealCandidate')} c WHERE c."mealId" = m.id AND (${Prisma.join(ranges, ' OR ')}))`);
    }
  return Prisma.sql`
    WITH page AS (
      SELECT m.* FROM ${databaseTable('Meal')} m WHERE ${Prisma.join(clauses, ' AND ')}
      ORDER BY m."createdAt" DESC, m.id DESC LIMIT ${limit} OFFSET ${skip}
    )
    SELECT m.id, m."hostId", m.title, m.description, m.area, m.restaurant, m.genre,
      m.alcohol, m.smoking, m."ageCondition", m.deadline, m."budgetMin", m."budgetMax",
      m."paymentType"::text AS "paymentType", m."maxParticipants", m.status::text AS status,
      m."firstJoinAt", m."matchedAt", m."demandClusterKey", m."createdAt", m."updatedAt",
      (SELECT jsonb_build_object('id', u.id, 'twitterUsername', u."twitterUsername", 'displayName', u."displayName",
        'image', u.image, 'bio', u.bio, 'createdAt', u."createdAt", 'diningTypes',
        COALESCE((SELECT jsonb_agg(jsonb_build_object('diningType', jsonb_build_object('id', d.id, 'slug', d.slug, 'label', d.label)) ORDER BY d."sortOrder")
          FROM ${databaseTable('UserDiningType')} ud JOIN ${databaseTable('DiningType')} d ON d.id = ud."diningTypeId"
          WHERE ud."userId" = u.id AND d."isActive"), '[]'::jsonb))
        FROM ${databaseTable('User')} u WHERE u.id = m."hostId") AS host,
      COALESCE((SELECT jsonb_agg(c) FROM (
        SELECT c.id, c."mealId", c.date, c."startTime", c."endTime", c."createdAt"
        FROM ${databaseTable('MealCandidate')} c WHERE c."mealId" = m.id ORDER BY c.date, c."startTime", c.id LIMIT 1
      ) c), '[]'::jsonb) AS candidates,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('purpose', jsonb_build_object('id', p.id, 'slug', p.slug, 'label', p.label)) ORDER BY p."sortOrder")
        FROM ${databaseTable('MealPurposeRelation')} mp JOIN ${databaseTable('MealPurpose')} p ON p.id = mp."purposeId"
        WHERE mp."mealId" = m.id AND p."isActive"), '[]'::jsonb) AS purposes,
      jsonb_build_object('candidates', (SELECT count(*)::int FROM ${databaseTable('MealCandidate')} c WHERE c."mealId" = m.id),
        'joinRequests', (SELECT count(*)::int FROM ${databaseTable('JoinRequest')} j WHERE j."mealId" = m.id AND j.status = 'ACCEPTED')) AS "_count",
      COALESCE((SELECT jsonb_agg(s) FROM (
        SELECT sm."sponsorName", sm.benefit, jsonb_build_object('planOverride', b."planOverride", 'subscription',
          (SELECT jsonb_build_object('plan', bs.plan, 'status', bs.status, 'currentPeriodEnd', bs."currentPeriodEnd")
            FROM ${databaseTable('BusinessSubscription')} bs WHERE bs."businessAccountId" = b.id)) AS "businessAccount"
        FROM ${databaseTable('SponsoredMeal')} sm JOIN ${databaseTable('BusinessAccount')} b ON b.id = sm."businessAccountId"
        WHERE sm."mealId" = m.id AND sm.status = 'ACTIVE' ORDER BY sm.id LIMIT 1
      ) s), '[]'::jsonb) AS "sponsoredMeals"
    FROM page m ORDER BY m."createdAt" DESC, m.id DESC
  `;
}

function hydrateRelations(rows: QueryRow[]) {
  return rows.map((row): MealRow => ({ ...row,
    host: { ...row.host, createdAt: databaseJsonDate(row.host.createdAt) },
    candidates: row.candidates.map(candidate => ({ ...candidate, date: databaseJsonDate(candidate.date), createdAt: databaseJsonDate(candidate.createdAt) })),
    sponsoredMeals: row.sponsoredMeals.map(sponsor => ({ ...sponsor, businessAccount: { ...sponsor.businessAccount,
      subscription: sponsor.businessAccount.subscription ? { ...sponsor.businessAccount.subscription, currentPeriodEnd: databaseJsonDate(sponsor.businessAccount.subscription.currentPeriodEnd) } : null,
    } })),
  }));
}

export function hydrateJsonMeals(rows: JsonMealRow[]) {
  return hydrateRelations(rows.map(row => ({ ...row,
    createdAt: databaseJsonDate(row.createdAt), updatedAt: databaseJsonDate(row.updatedAt),
    deadline: row.deadline ? databaseJsonDate(row.deadline) : null,
    firstJoinAt: row.firstJoinAt ? databaseJsonDate(row.firstJoinAt) : null,
    matchedAt: row.matchedAt ? databaseJsonDate(row.matchedAt) : null,
  })));
}

export async function fetchOpenMeals(filters: MealListFilters, limit: number, skip = 0) {
  return hydrateRelations(await prisma.$queryRaw<QueryRow[]>(buildOpenMealsQuery(filters, limit, skip)));
}
