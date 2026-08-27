/**
 * Date-range helpers for the attendance views. Everything works in **UTC** to
 * match how the server stores attendance dates (UTC midnight), so a day never
 * shifts due to the browser's timezone. `YYYY-MM-DD` strings ("date keys") are
 * the currency here — they map 1:1 to a stored day and to <input type="date">.
 */

/** A Date (or ISO string) → 'YYYY-MM-DD' in UTC. */
export function toDateKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

/** Today as a date key. */
export function todayKey() {
  return toDateKey(new Date());
}

/** Build the inclusive list of date keys between two UTC days. */
function daysBetween(startUtc, endUtc) {
  const days = [];
  for (let t = startUtc.getTime(); t <= endUtc.getTime(); t += 86_400_000) {
    days.push(toDateKey(new Date(t)));
  }
  return days;
}

/** The calendar month containing `refKey`. */
export function monthRange(refKey) {
  const d = new Date(refKey);
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  return { from: toDateKey(start), to: toDateKey(end), days: daysBetween(start, end) };
}

/** The Saturday-start week containing `refKey` (KSA weekend is Fri–Sat). */
export function weekRange(refKey) {
  const d = new Date(refKey);
  // getUTCDay: Sun=0 … Sat=6. Days since the most recent Saturday:
  const sinceSaturday = (d.getUTCDay() + 1) % 7;
  const start = new Date(d.getTime() - sinceSaturday * 86_400_000);
  const startUtc = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const endUtc = new Date(startUtc.getTime() + 6 * 86_400_000);
  return { from: toDateKey(startUtc), to: toDateKey(endUtc), days: daysBetween(startUtc, endUtc) };
}

/** Shift a date key by whole months (for grid navigation). */
export function addMonths(refKey, n) {
  const d = new Date(refKey);
  return toDateKey(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1)));
}

/** Shift a date key by whole days. */
export function addDays(refKey, n) {
  return toDateKey(new Date(new Date(refKey).getTime() + n * 86_400_000));
}

/** 'July 2026' for a date key. */
export function monthLabel(refKey) {
  return new Date(refKey).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Short column header like 'Sat 20' for a date key. */
export function dayHeader(dateKey) {
  return new Date(dateKey).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/** True if the date key falls on the KSA weekend (Fri or Sat). */
export function isWeekend(dateKey) {
  const day = new Date(dateKey).getUTCDay();
  return day === 5 || day === 6; // Fri, Sat
}

/** 0=Sun..6=Sat for a date key — matches Employee.weeklyOffDay's convention. */
export function dayOfWeek(dateKey) {
  return new Date(dateKey).getUTCDay();
}
