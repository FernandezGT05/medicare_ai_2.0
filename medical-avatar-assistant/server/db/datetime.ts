/** SQLite `datetime('now')` is UTC but has no offset suffix — parse as UTC. */
export function parseSqliteUtc(value: string): Date {
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

export function toSqliteUtcIso(date: Date): string {
  return date.toISOString();
}
