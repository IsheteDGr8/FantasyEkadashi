/**
 * Ekadashi date calculation.
 *
 * Background: a "tithi" is 1/30th of a synodic lunar month (one tithi ≈ 12°
 * of moon-sun elongation). Tithi 11 of the bright half (Shukla Paksha) and
 * tithi 11 of the dark half (Krishna Paksha) are both called Ekadashi.
 * There are ~24 Ekadashis per year.
 *
 * Because tithis are 20-26h long (mean ~23.6h) and calendar days are 24h,
 * occasionally a tithi spans two sunrises (vriddhi → "doubled") or falls
 * entirely between two consecutive sunrises (kshaya → "skipped"). To avoid
 * either case producing wrong scheduling, we don't sample at sunrise. Instead
 * we:
 *
 *   1. Walk forward hourly from a start instant, tracking moon phase.
 *   2. Identify every window during which the tithi index is 10 (Shukla
 *      Ekadashi) or 25 (Krishna Ekadashi).
 *   3. Assign each window to the calendar date (in the user's timezone) that
 *      contains the window's midpoint.
 *
 * This yields exactly one Ekadashi per half-month, in a stable order.
 *
 * Results are memoized per (year, timezone).
 */

import SunCalc from "suncalc";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { addDays } from "date-fns";

export const DEFAULT_TIMEZONE = "Asia/Kolkata";

export type Paksha = "shukla" | "krishna";

export interface EkadashiInfo {
  /** Calendar date at midnight in the reference timezone, normalized to UTC. */
  date: Date;
  paksha: Paksha;
}

const SAMPLE_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

function tithiIndexAt(instant: Date): number {
  const phase = SunCalc.getMoonIllumination(instant).phase; // 0..1
  return Math.floor(phase * 30) % 30;
}

function startOfDayInTz(d: Date, tz: string): Date {
  const z = toZonedTime(d, tz);
  const iso = `${z.getFullYear()}-${String(z.getMonth() + 1).padStart(2, "0")}-${String(z.getDate()).padStart(2, "0")}T00:00:00`;
  return fromZonedTime(iso, tz);
}

/**
 * Find every Ekadashi occurrence whose midpoint falls within [start, end).
 * Bounds are interpreted in UTC.
 */
function computeEkadashisInRange(
  start: Date,
  end: Date,
  timeZone: string,
): EkadashiInfo[] {
  // Extend the search window slightly so we catch tithis straddling the
  // boundary.
  const PAD_DAYS = 2;
  const padMs = PAD_DAYS * 24 * 60 * 60 * 1000;
  const searchStart = new Date(start.getTime() - padMs);
  const searchEnd = new Date(end.getTime() + padMs);

  const occurrences: EkadashiInfo[] = [];
  let cursor = new Date(searchStart.getTime());
  let prevTithi = tithiIndexAt(cursor);
  let windowStart: Date | null =
    prevTithi === 10 || prevTithi === 25 ? cursor : null;

  cursor = new Date(cursor.getTime() + SAMPLE_INTERVAL_MS);
  while (cursor <= searchEnd) {
    const t = tithiIndexAt(cursor);
    const isEk = t === 10 || t === 25;
    const prevIsEk = prevTithi === 10 || prevTithi === 25;

    if (isEk && !prevIsEk) {
      windowStart = new Date(cursor);
    } else if (!isEk && prevIsEk && windowStart) {
      const mid = new Date((windowStart.getTime() + cursor.getTime()) / 2);
      if (mid >= start && mid < end) {
        const day = startOfDayInTz(mid, timeZone);
        occurrences.push({
          date: day,
          paksha: prevTithi === 10 ? "shukla" : "krishna",
        });
      }
      windowStart = null;
    }
    prevTithi = t;
    cursor = new Date(cursor.getTime() + SAMPLE_INTERVAL_MS);
  }
  return occurrences;
}

// Memoize per (year, tz).
const yearCache = new Map<string, EkadashiInfo[]>();

function getEkadashisForYear(year: number, timeZone: string): EkadashiInfo[] {
  const key = `${year}|${timeZone}`;
  let cached = yearCache.get(key);
  if (cached) return cached;
  const start = fromZonedTime(`${year}-01-01T00:00:00`, timeZone);
  const end = fromZonedTime(`${year + 1}-01-01T00:00:00`, timeZone);
  cached = computeEkadashisInRange(start, end, timeZone);
  yearCache.set(key, cached);
  return cached;
}

/** True if the given calendar date is an Ekadashi day in the given tz. */
export function isEkadashi(
  date: Date,
  timeZone: string = DEFAULT_TIMEZONE,
): boolean {
  const z = toZonedTime(date, timeZone);
  const dayStart = startOfDayInTz(date, timeZone).getTime();
  const list = getEkadashisForYear(z.getFullYear(), timeZone);
  return list.some((e) => e.date.getTime() === dayStart);
}

export function getPaksha(
  date: Date,
  timeZone: string = DEFAULT_TIMEZONE,
): Paksha | null {
  const z = toZonedTime(date, timeZone);
  const dayStart = startOfDayInTz(date, timeZone).getTime();
  const list = getEkadashisForYear(z.getFullYear(), timeZone);
  return list.find((e) => e.date.getTime() === dayStart)?.paksha ?? null;
}

/**
 * Find the next Ekadashi at or after `from`. If `from` itself is Ekadashi
 * and `includeToday` is true, returns today.
 */
export function getNextEkadashi(
  from: Date = new Date(),
  timeZone: string = DEFAULT_TIMEZONE,
  includeToday = true,
): EkadashiInfo {
  const fromDay = startOfDayInTz(from, timeZone);
  const threshold = includeToday
    ? fromDay
    : startOfDayInTz(addDays(fromDay, 1), timeZone);

  const z = toZonedTime(from, timeZone);
  const year = z.getFullYear();
  for (let i = 0; i < 2; i++) {
    const list = getEkadashisForYear(year + i, timeZone);
    const match = list.find((e) => e.date.getTime() >= threshold.getTime());
    if (match) return match;
  }
  throw new Error("Could not find next Ekadashi within 2 years");
}

export function getPreviousEkadashi(
  from: Date = new Date(),
  timeZone: string = DEFAULT_TIMEZONE,
): EkadashiInfo {
  const fromDay = startOfDayInTz(from, timeZone);
  const z = toZonedTime(from, timeZone);
  const year = z.getFullYear();
  for (let i = 0; i < 2; i++) {
    const list = getEkadashisForYear(year - i, timeZone)
      .slice()
      .reverse();
    const match = list.find((e) => e.date.getTime() < fromDay.getTime());
    if (match) return match;
  }
  throw new Error("Could not find previous Ekadashi within 2 years");
}

/** All Ekadashis from `start` (inclusive) to `end` (exclusive). */
export function listEkadashisBetween(
  start: Date,
  end: Date,
  timeZone: string = DEFAULT_TIMEZONE,
): EkadashiInfo[] {
  const zs = toZonedTime(start, timeZone);
  const ze = toZonedTime(end, timeZone);
  const out: EkadashiInfo[] = [];
  for (let y = zs.getFullYear(); y <= ze.getFullYear(); y++) {
    out.push(
      ...getEkadashisForYear(y, timeZone).filter(
        (e) => e.date >= start && e.date < end,
      ),
    );
  }
  return out;
}

/**
 * Window during which match submissions are accepted: the full Ekadashi day
 * in the reference timezone, plus `graceHours` after midnight so users can
 * submit their end-of-day screen time.
 */
export interface SubmissionWindow {
  opensAt: Date;
  closesAt: Date;
}

export function getSubmissionWindow(
  ekadashiDate: Date,
  timeZone: string = DEFAULT_TIMEZONE,
  graceHours = 12,
): SubmissionWindow {
  const opens = startOfDayInTz(ekadashiDate, timeZone);
  const closes = new Date(
    opens.getTime() + (24 + graceHours) * 60 * 60 * 1000,
  );
  return { opensAt: opens, closesAt: closes };
}
