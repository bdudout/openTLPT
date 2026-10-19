// Arithmétique de dates calendaires (MODELE_DONNEES §1.5). Tout est calculé en UTC sur des dates
// sans heure : aucun effet des fuseaux ni des changements d'heure.
import type { ISODate, Offset } from './types.ts';

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

/** Convertit `YYYY-MM-DD` en nombre de jours depuis l'époque Unix ; rejette les dates invalides (2026-02-30). */
export function toDayNumber(date: ISODate): number {
  const m = ISO_RE.exec(date);
  if (!m) throw new RangeError(`date ISO invalide : ${date}`);
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const ms = Date.UTC(y, mo - 1, d);
  const check = new Date(ms);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) {
    throw new RangeError(`date inexistante : ${date}`);
  }
  return ms / DAY_MS;
}

export function fromDayNumber(n: number): ISODate {
  return new Date(n * DAY_MS).toISOString().slice(0, 10);
}

export function isValidISODate(date: string): boolean {
  try { toDayNumber(date); return true; } catch { return false; }
}

export function addDays(date: ISODate, days: number): ISODate {
  return fromDayNumber(toDayNumber(date) + days);
}

/** Différence en jours calendaires (b - a). */
export function diffDays(a: ISODate, b: ISODate): number {
  return toDayNumber(b) - toDayNumber(a);
}

function daysInMonth(year: number, month0: number): number {
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
}

/** Ajoute des mois en gardant le quantième, ramené au dernier jour du mois s'il n'existe pas (31/08 + 6 mois = 28 ou 29/02). */
export function addMonths(date: ISODate, months: number): ISODate {
  const d = new Date(toDayNumber(date) * DAY_MS);
  const total = d.getUTCFullYear() * 12 + d.getUTCMonth() + months;
  const year = Math.floor(total / 12);
  const month0 = total - year * 12;
  const day = Math.min(d.getUTCDate(), daysInMonth(year, month0));
  return fromDayNumber(Date.UTC(year, month0, day) / DAY_MS);
}

export function addYears(date: ISODate, years: number): ISODate {
  return addMonths(date, years * 12);
}

/** Jour ouvré = lundi à vendredi (jours fériés non gérés en v1). */
export function isWorkingDay(date: ISODate): boolean {
  const wd = new Date(toDayNumber(date) * DAY_MS).getUTCDay();
  return wd !== 0 && wd !== 6;
}

/** n-ième jour ouvré suivant la date (la date de départ n'est pas comptée). */
export function addWorkingDays(date: ISODate, n: number): ISODate {
  if (n < 0) throw new RangeError('addWorkingDays : n négatif non supporté');
  let cur = date;
  let left = n;
  while (left > 0) {
    cur = addDays(cur, 1);
    if (isWorkingDay(cur)) left--;
  }
  return cur;
}

export function addOffset(date: ISODate, offset: Offset): ISODate {
  switch (offset.unit) {
    case 'days': return addDays(date, offset.value);
    case 'weeks': return addDays(date, 7 * offset.value);
    case 'months': return addMonths(date, offset.value);
    case 'years': return addYears(date, offset.value);
    case 'working_days': return addWorkingDays(date, offset.value);
  }
}

export function minDate(a: ISODate, b: ISODate): ISODate {
  return toDayNumber(a) <= toDayNumber(b) ? a : b;
}
