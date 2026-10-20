const DAY = 86400000;
export const toDate = (s: string) => new Date(s + "T00:00:00Z");
export const toISO = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (s: string, n: number) => toISO(new Date(toDate(s).getTime() + n * DAY));
export const daysBetween = (a: string, b: string) => Math.round((toDate(b).getTime() - toDate(a).getTime()) / DAY);

/** Monday of the ISO week containing the date. */
export function weekStart(s: string) {
  const d = toDate(s);
  const dow = (d.getUTCDay() + 6) % 7;
  return toISO(new Date(d.getTime() - dow * DAY));
}
export const monthKey = (s: string) => s.slice(0, 7);

export function eachDay(from: string, to: string) {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const fmtMonth = (key: string) => `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;
export const fmtDay = (s: string) => `${MONTHS[Number(s.slice(5, 7)) - 1]} ${Number(s.slice(8, 10))}, ${s.slice(0, 4)}`;
