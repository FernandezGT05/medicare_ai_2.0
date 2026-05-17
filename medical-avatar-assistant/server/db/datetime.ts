/** Parse UTC timestamps from the database (Postgres TIMESTAMPTZ or legacy text). */
export function parseDbUtc(value: string | Date): Date {
  if (value instanceof Date) {
    return value;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return new Date(Number.NaN);
  }
  if (/[zZ]$/.test(trimmed) || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
    return new Date(trimmed);
  }
  const isoLike = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T");
  return new Date(`${isoLike}Z`);
}

export function toDbUtcIso(date: Date): string {
  return date.toISOString();
}

/** @deprecated Use parseDbUtc */
export const parseSqliteUtc = parseDbUtc;

/** @deprecated Use toDbUtcIso */
export const toSqliteUtcIso = toDbUtcIso;
