const pad = (n: number): string => String(n).padStart(2, '0');

/** Lokale Zeit als ISO-Text ohne Zeitzone, z. B. 2026-11-21T15:30:00 */
export function toLocalIso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

export function toLocalDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
export function weekday(d: Date): string {
  return WEEKDAYS[d.getDay()];
}

export function fmtDateTime(d: Date): string {
  return `${weekday(d).slice(0, 2)}, ${pad(d.getDate())}.${pad(d.getMonth() + 1)}. ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function fmtDay(d: Date): string {
  return `${weekday(d).slice(0, 2)}, ${pad(d.getDate())}.${pad(d.getMonth() + 1)}.`;
}
export function fmtTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Liest vom Modell gelieferten ISO-Text. Ohne Zeitzone gilt die lokale Zeit. */
export function parseDate(s: unknown): Date | null {
  if (typeof s !== 'string' || !s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}
export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes(), 0, 0);
}
