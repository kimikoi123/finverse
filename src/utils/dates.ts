export function formatDisplayDate(iso: string): string {
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  const [y, m, d] = parts;
  if (!y || !m || !d) return iso;
  return `${m}/${d}/${y}`;
}

function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayISO(): string {
  return toISO(new Date());
}

export function yesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toISO(d);
}

// Parse a "YYYY-MM-DD" string as LOCAL midnight. Using `new Date(iso)` parses
// it as UTC midnight, which renders as the previous day in negative-UTC zones
// and shifts month/day membership in PHT (UTC+8). Always use this for stored
// calendar dates that should be interpreted in the user's local timezone.
// Full timestamps (e.g. "2026-08-31T10:00:00.000Z", as stored for settledAt)
// already carry a zone, so they're parsed natively and shown in local time.
export function parseISODateLocal(iso: string): Date {
  if (iso.includes('T')) return new Date(iso);
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d);
}
