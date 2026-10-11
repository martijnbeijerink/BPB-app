// Namen, datums en tijden weergeven.

const months = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const weekdays = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];
const monthsLong = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
const daysAgo = (date: Date, now: Date) => Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);

/** Korte dag voor in een lijst: "Vandaag", "Gisteren" of "8 okt". */
export function dayLabel(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const ago = daysAgo(date, now);
  if (ago === 0) return 'Vandaag';
  if (ago === 1) return 'Gisteren';
  const year = date.getFullYear() === now.getFullYear() ? '' : ` ${date.getFullYear()}`;
  return `${date.getDate()} ${months[date.getMonth()]}${year}`;
}

/** Volledige dag als tussenkop in een gesprek: "Vandaag" of "Donderdag 8 oktober". */
export function dayHeading(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const ago = daysAgo(date, now);
  if (ago === 0) return 'Vandaag';
  if (ago === 1) return 'Gisteren';
  return `${weekdays[date.getDay()]} ${date.getDate()} ${monthsLong[date.getMonth()]}`;
}

/** Tijd als "09:05". */
export function timeLabel(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** Vallen twee tijdstippen op dezelfde dag? */
export const sameDay = (a: string, b: string) => startOfDay(new Date(a)) === startOfDay(new Date(b));

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? '';

/** Initialen voor het rondje naast een naam: "Anouk V." wordt "AV". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase());
  return letters.join('') || '?';
}

/** Weekdag voluit, met hoofdletter: "Dinsdag". */
export const weekdayName = (date: Date) => weekdays[date.getDay()];
/** Korte maand: "okt". */
export const monthShort = (date: Date) => months[date.getMonth()];
/** Maand voluit; month loopt van 0 (januari) tot 11. */
export const monthLong = (month: number) => monthsLong[month];
