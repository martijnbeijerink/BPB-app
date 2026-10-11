// Rekenen met dagen en maanden voor het scherm Afspraken: het maandrooster
// om een datum te kiezen, en de verdeling in komend en geweest.

/** De weken van een maand, met maandag als eerste dag. Vakjes buiten de maand zijn null. */
export function monthGrid(year: number, month: number): (number | null)[][] {
  const days = new Date(year, month + 1, 0).getDate();
  const lead = (new Date(year, month, 1).getDay() + 6) % 7; // maandag = 0
  const cells: (number | null)[] = [...Array<null>(lead).fill(null), ...Array.from({ length: days }, (_, index) => index + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let index = 0; index < cells.length; index += 7) weeks.push(cells.slice(index, index + 7));
  return weeks;
}

/** Een maand verder of terug; month loopt van 0 (januari) tot 11. */
export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const total = year * 12 + month + delta;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}

/** Ligt deze dag vóór vandaag? */
export function isPastDay(year: number, month: number, day: number, now: Date): boolean {
  return new Date(year, month, day).getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

/** Het gekozen moment in de tijdzone van de telefoon, als tekst voor de database. */
export function localMoment(year: number, month: number, day: number, hour: number, minute: number): Date {
  return new Date(year, month, day, hour, minute, 0, 0);
}

/** Komende afspraken met de eerstvolgende bovenaan; afspraken die zijn geweest met de laatste bovenaan. */
export function splitAppointments<T extends { starts_at: string }>(list: T[], now: Date): { coming: T[]; been: T[] } {
  const time = (item: T) => new Date(item.starts_at).getTime();
  const coming = list.filter((item) => time(item) >= now.getTime()).sort((a, b) => time(a) - time(b));
  const been = list.filter((item) => time(item) < now.getTime()).sort((a, b) => time(b) - time(a));
  return { coming, been };
}
