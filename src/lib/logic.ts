// Reine Logik ohne Abhängigkeiten von React Native, damit sie sich testen lässt.

export type GradeLike = { value: number; weight: number };

/** Gewichteter Durchschnitt, null ohne Noten. */
export function gradeAverage(grades: GradeLike[]): number | null {
  const w = grades.reduce((s, g) => s + g.weight, 0);
  if (w <= 0) return null;
  return grades.reduce((s, g) => s + g.value * g.weight, 0) / w;
}

/**
 * Welche Note braucht die nächste Arbeit (Gewicht nextWeight), damit der Schnitt das Ziel erreicht?
 * Gibt null zurück, wenn es keine Rechnung gibt.
 */
export function neededGrade(grades: GradeLike[], target: number, nextWeight: number): number | null {
  if (nextWeight <= 0) return null;
  const w = grades.reduce((s, g) => s + g.weight, 0);
  const sum = grades.reduce((s, g) => s + g.value * g.weight, 0);
  return (target * (w + nextWeight) - sum) / nextWeight;
}

/** Leitner-Boxen: Abstände in Tagen pro Box. */
export const BOX_DAYS = [0, 1, 3, 7, 16, 35];

export function nextSchedule(box: number, correct: boolean, now: number): { box: number; due: number } {
  const nb = correct ? Math.min(box + 1, BOX_DAYS.length - 1) : 0;
  const days = BOX_DAYS[nb];
  // falsche Karten kommen in 10 Minuten wieder, richtige nach dem Boxen-Abstand
  const due = correct ? now + days * 24 * 3600 * 1000 : now + 10 * 60 * 1000;
  return { box: nb, due };
}

/** Anzahl aufeinanderfolgender Tage bis heute (oder bis gestern, wenn heute noch offen ist). */
export function streak(days: string[], today: string): number {
  const set = new Set(days);
  const d = parseDay(today);
  if (!d) return 0;
  if (!set.has(today)) d.setDate(d.getDate() - 1);
  let n = 0;
  for (;;) {
    const key = fmtDay(d);
    if (!set.has(key)) break;
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export function parseDay(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}
export function fmtDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Montag=1 … Sonntag=7 */
export function isoWeekday(d: Date): number {
  const g = d.getDay();
  return g === 0 ? 7 : g;
}

export function validHM(s: string): boolean {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return false;
  return Number(m[1]) < 24 && Number(m[2]) < 60;
}
export function normHM(s: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : s;
}

export const WEEKDAY_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

/** Notenwert aus Text wie "2,3" oder "2.3" */
export function parseGrade(s: string): number | null {
  const v = Number(s.replace(',', '.').trim());
  if (!Number.isFinite(v) || v < 1 || v > 6) return null;
  return v;
}

export function parseAmount(s: string): number | null {
  const v = Number(s.replace(',', '.').replace(/€/g, '').trim());
  return Number.isFinite(v) && v !== 0 ? v : null;
}

export function fmtEuro(v: number): string {
  const sign = v < 0 ? '-' : '';
  return `${sign}${Math.abs(v).toFixed(2).replace('.', ',')} €`;
}
