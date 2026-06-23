/**
 * Ekadashi date calculation.
 *
 * A "tithi" is 1/30th of a synodic lunar month (~12° of moon-sun elongation).
 * Tithi 11 of the bright half (Shukla Paksha) and tithi 11 of the dark half
 * (Krishna Paksha) are both Ekadashi — ~24 per year.
 *
 * Tithis are 20-26h long, so occasionally one spans two sunrises (vriddhi /
 * "doubled") or falls entirely between two sunrises (kshaya / "skipped").
 * Sampling at a single sunrise therefore mis-dates some Ekadashis. Instead we:
 *   1. Walk forward hourly, tracking the moon phase.
 *   2. Find each window where the tithi index is 10 (Shukla) or 25 (Krishna).
 *   3. Assign each window to the calendar date (in the group's timezone)
 *      containing the window's midpoint.
 * This yields exactly one Ekadashi per half-month. Results are memoized.
 */

import SunCalc from "suncalc";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { addDays } from "date-fns";

export const DEFAULT_TIMEZONE = "Asia/Kolkata";

export type Paksha = "shukla" | "krishna";

export interface EkadashiInfo {
  /** Calendar date at midnight in the reference timezone, as a UTC instant. */
  date: Date;
  paksha: Paksha;
}

const SAMPLE_INTERVAL_MS = 60 * 60 * 1000;

function tithiIndexAt(instant: Date): number {
  const phase = SunCalc.getMoonIllumination(instant).phase; // 0..1
  return Math.floor(phase * 30) % 30;
}

function startOfDayInTz(d: Date, tz: string): Date {
  const z = toZonedTime(d, tz);
  const iso = `${z.getFullYear()}-${String(z.getMonth() + 1).padStart(2, "0")}-${String(z.getDate()).padStart(2, "0")}T00:00:00`;
  return fromZonedTime(iso, tz);
}

function computeEkadashisInRange(
  start: Date,
  end: Date,
  timeZone: string,
): EkadashiInfo[] {
  const padMs = 2 * 24 * 60 * 60 * 1000;
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
        occurrences.push({
          date: startOfDayInTz(mid, timeZone),
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

const yearCache = new Map<string, EkadashiInfo[]>();

function getEkadashisForYear(year: number, timeZone: string): EkadashiInfo[] {
  const key = `${year}|${timeZone}`;
  const cached = yearCache.get(key);
  if (cached) return cached;
  const start = fromZonedTime(`${year}-01-01T00:00:00`, timeZone);
  const end = fromZonedTime(`${year + 1}-01-01T00:00:00`, timeZone);
  const result = computeEkadashisInRange(start, end, timeZone);
  yearCache.set(key, result);
  return result;
}

export function isEkadashi(date: Date, timeZone = DEFAULT_TIMEZONE): boolean {
  const z = toZonedTime(date, timeZone);
  const dayStart = startOfDayInTz(date, timeZone).getTime();
  return getEkadashisForYear(z.getFullYear(), timeZone).some(
    (e) => e.date.getTime() === dayStart,
  );
}

export function getPaksha(date: Date, timeZone = DEFAULT_TIMEZONE): Paksha | null {
  const z = toZonedTime(date, timeZone);
  const dayStart = startOfDayInTz(date, timeZone).getTime();
  return (
    getEkadashisForYear(z.getFullYear(), timeZone).find(
      (e) => e.date.getTime() === dayStart,
    )?.paksha ?? null
  );
}

export function getNextEkadashi(
  from: Date = new Date(),
  timeZone = DEFAULT_TIMEZONE,
  includeToday = true,
): EkadashiInfo {
  const fromDay = startOfDayInTz(from, timeZone);
  const threshold = includeToday
    ? fromDay
    : startOfDayInTz(addDays(fromDay, 1), timeZone);
  const year = toZonedTime(from, timeZone).getFullYear();
  for (let i = 0; i < 2; i++) {
    const match = getEkadashisForYear(year + i, timeZone).find(
      (e) => e.date.getTime() >= threshold.getTime(),
    );
    if (match) return match;
  }
  throw new Error("Could not find next Ekadashi within 2 years");
}

/**
 * Find the next Ekadashi using a canonical timezone (IST — the traditional
 * reference for the date) but anchor it to midnight in a display timezone. This
 * keeps the calendar date the same as India (e.g. June 25) while the countdown
 * targets the viewer's local midnight of that date.
 */
export function getNextEkadashiInZone(
  from: Date,
  canonicalTimeZone: string,
  displayTimeZone: string,
): EkadashiInfo {
  const ek = getNextEkadashi(from, canonicalTimeZone, true);
  const z = toZonedTime(ek.date, canonicalTimeZone);
  const iso = `${z.getFullYear()}-${String(z.getMonth() + 1).padStart(2, "0")}-${String(z.getDate()).padStart(2, "0")}T00:00:00`;
  return { date: fromZonedTime(iso, displayTimeZone), paksha: ek.paksha };
}

export function listEkadashisBetween(
  start: Date,
  end: Date,
  timeZone = DEFAULT_TIMEZONE,
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

export interface SubmissionWindow {
  opensAt: Date;
  closesAt: Date;
}

/**
 * Submissions open the day AFTER the Ekadashi (so the screenshot captures the
 * full Ekadashi day's totals) and stay open for `graceDays` days, closing at
 * the start of the following day — all in the group's timezone.
 *
 * Example (graceDays = 2): Ekadashi Jun 25 -> opens Jun 26 00:00,
 * closes Jun 28 00:00 (upload through the evening of Jun 27).
 */
export function getSubmissionWindow(
  ekadashiDate: Date,
  timeZone = DEFAULT_TIMEZONE,
  graceDays = 2,
): SubmissionWindow {
  const ekStart = startOfDayInTz(ekadashiDate, timeZone);
  const opensAt = startOfDayInTz(addDays(ekStart, 1), timeZone);
  const closesAt = startOfDayInTz(addDays(ekStart, 1 + graceDays), timeZone);
  return { opensAt, closesAt };
}

/** Parse a 'YYYY-MM-DD' DB date into a UTC instant at local midnight. */
export function parseEkadashiDate(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00Z");
}

/**
 * When matchups for an Ekadashi are generated: midnight (00:00) the day before
 * the Ekadashi, in the group's timezone. (Ekadashi June 25 -> June 24 00:00.)
 */
export function getMatchupGenerationTime(
  ekadashiDate: Date,
  timeZone = DEFAULT_TIMEZONE,
): Date {
  const dayStart = startOfDayInTz(ekadashiDate, timeZone);
  return new Date(dayStart.getTime() - 24 * 60 * 60 * 1000);
}

/**
 * Latest moment a player can join and still be matched for an Ekadashi: one
 * hour before matchups are generated (23:00 two days before). The hour between
 * the cutoff and generation is intentional downtime.
 * (Ekadashi June 25 -> cutoff June 23 23:00.)
 */
export function getJoinCutoff(
  ekadashiDate: Date,
  timeZone = DEFAULT_TIMEZONE,
): Date {
  return new Date(
    getMatchupGenerationTime(ekadashiDate, timeZone).getTime() - 60 * 60 * 1000,
  );
}
