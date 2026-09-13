// PostgreSQL timestamp (without timezone) JSON values represent UTC, as Prisma
// DateTime does. Date columns returned outside JSON are decoded by Prisma itself.
export function databaseJsonDate(value: string) {
  return new Date(/(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : `${value}Z`);
}

export type DatabaseJson<T> = T extends Date ? string
  : T extends (infer Item)[] ? DatabaseJson<Item>[]
  : T extends object ? { [Key in keyof T]: DatabaseJson<T[Key]> }
  : T;
