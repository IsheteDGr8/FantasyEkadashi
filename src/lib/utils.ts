import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { customAlphabet } from "nanoid";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Unambiguous uppercase code, easy to read aloud: e.g. "K7P3WX". */
const codeAlphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const generateCode = customAlphabet(codeAlphabet, 6);

export function generateInviteCode(): string {
  return generateCode();
}

/**
 * Parse a screen time string like "4h 23m", "4:23", "4 hours 23 minutes",
 * "1h", "37m", "2 hr 5 min", returning total minutes — or null if unparseable.
 */
export function parseScreenTimeToMinutes(input: string): number | null {
  if (!input) return null;
  const s = input.toLowerCase().replace(/[,;]/g, " ").trim();

  // Pattern A: HH:MM
  const colon = s.match(/^(\d{1,2}):(\d{2})$/);
  if (colon) {
    const h = parseInt(colon[1], 10);
    const m = parseInt(colon[2], 10);
    if (m < 60) return h * 60 + m;
  }

  // Pattern B: combined units
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

  // Pattern C: bare number → minutes
  const bare = s.match(/^(\d+(?:\.\d+)?)$/);
  if (bare) return Math.round(parseFloat(bare[1]));

  return null;
}

export function formatMinutes(minutes: number): string {
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
