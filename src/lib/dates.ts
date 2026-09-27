// Local-calendar date helpers. Dates travel as `YYYY-MM-DD` strings (Postgres
// `date`), never as UTC timestamps, so a Monday stays a Monday in Jakarta.

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Monday of the week containing `d` (ISO week: Mon–Sun). */
export function mondayOf(d: Date = new Date()): string {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const isoDow = copy.getDay() === 0 ? 7 : copy.getDay();
  copy.setDate(copy.getDate() - (isoDow - 1));
  return toISODate(copy);
}

export function weekDays(monday: string, withWeekend: boolean): string[] {
  return Array.from({ length: withWeekend ? 7 : 5 }, (_, i) => addDays(monday, i));
}

const dayFmt = new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short" });
const longFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" });

export function formatDay(iso: string): string {
  return dayFmt.format(fromISODate(iso));
}

export function formatWeek(monday: string): string {
  return `${longFmt.format(fromISODate(monday))} – ${longFmt.format(fromISODate(addDays(monday, 6)))}`;
}

export function formatHours(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ",");
}

/** First day of the month containing `d`, as YYYY-MM-01. */
export function monthOf(d: Date = new Date()): string {
  return toISODate(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function addMonths(isoMonth: string, n: number): string {
  const d = fromISODate(isoMonth);
  return toISODate(new Date(d.getFullYear(), d.getMonth() + n, 1));
}

export function monthRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let m = from; m <= to && out.length < 36; m = addMonths(m, 1)) out.push(m);
  return out;
}

const monthFmt = new Intl.DateTimeFormat("id-ID", { month: "short", year: "numeric" });
const monthLongFmt = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" });

export function formatMonth(isoMonth: string, long = false): string {
  return (long ? monthLongFmt : monthFmt).format(fromISODate(isoMonth));
}

/** `<input type="month">` value (YYYY-MM) ↔ YYYY-MM-01. */
export const monthInputToISO = (v: string) => (v ? `${v}-01` : "");
export const isoToMonthInput = (iso: string) => iso.slice(0, 7);
