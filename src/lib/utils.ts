import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { customAlphabet } from "nanoid";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const codeAlphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const generateCode = customAlphabet(codeAlphabet, 6);

/** Unambiguous, easy-to-read-aloud join code, e.g. "K7P3WX". */
export function generateJoinCode(): string {
  return generateCode();
}

/**
 * Lowercase + trim an email and verify it's a plausible address. Returns null
 * if it doesn't look like an email. Used as the login identifier.
 */
export function normalizeEmail(input: string): string | null {
  if (!input) return null;
  const email = input.trim().toLowerCase();
  // Pragmatic check: something@something.tld, no spaces.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

/**
 * Parse a screen-time string like "4h 23m", "4:23", "1h", "37m", "2 hr 5 min"
 * into total minutes — or null if unparseable.
 */
export function parseTimeToMinutes(input: string): number | null {
  if (!input) return null;
  const s = input.toLowerCase().replace(/[,;]/g, " ").trim();

  const colon = s.match(/^(\d{1,2}):(\d{2})$/);
  if (colon) {
    const h = parseInt(colon[1], 10);
    const m = parseInt(colon[2], 10);
    if (m < 60) return h * 60 + m;
  }

  let hours = 0;
  let minutes = 0;
  let matched = false;
  const hMatch = s.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/);
  if (hMatch) {
    hours = parseFloat(hMatch[1]);
    matched = true;
  }
  const mMatch = s.match(/(\d+(?:\.\d+)?)\s*(?:m|min|mins|minute|minutes)\b/);
  if (mMatch) {
    minutes = parseFloat(mMatch[1]);
    matched = true;
  }
  if (matched) return Math.round(hours * 60 + minutes);

  const bare = s.match(/^(\d+(?:\.\d+)?)$/);
  if (bare) return Math.round(parseFloat(bare[1]));

  return null;
}

export function formatMinutes(minutes: number): string {
  if (minutes <= 0) return "0m";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function formatDate(date: Date | string, timeZone = "Asia/Kolkata"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone,
  });
}

/**
 * Format a plain 'YYYY-MM-DD' calendar date (e.g. an Ekadashi date) for display
 * without any timezone shifting — the stored date is the date we show, so it
 * reads the same (e.g. "Jun 25") for every viewer regardless of their zone.
 */
export function formatDateStr(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map((n) => parseInt(n, 10));
  if (!y || !m || !d) return dateStr;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
