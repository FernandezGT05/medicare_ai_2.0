/** Format ISO date for display in dashboard lists. */
export function formatDashboardDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** `datetime-local` input value from Date or ISO string. */
export function toDatetimeLocalValue(date: Date | string = new Date()): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** ISO string from `datetime-local` input value. */
export function fromDatetimeLocalValue(value: string): string {
  return new Date(value).toISOString();
}
