// Sanity check: list Ekadashis for next 13 months using midpoint algorithm.
//   node scripts/check-ekadashi.mjs
import SunCalc from "suncalc";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

const TZ = "Asia/Kolkata";
const STEP = 60 * 60 * 1000;

function tithi(d) {
  return Math.floor(SunCalc.getMoonIllumination(d).phase * 30) % 30;
}
function dayStartTz(d) {
  const z = toZonedTime(d, TZ);
  const iso = `${z.getFullYear()}-${String(z.getMonth() + 1).padStart(2, "0")}-${String(z.getDate()).padStart(2, "0")}T00:00:00`;
  return fromZonedTime(iso, TZ);
}

const start = new Date();
const end = new Date(start.getTime() + 400 * 24 * 60 * 60 * 1000);
const pad = 2 * 24 * 60 * 60 * 1000;
let cursor = new Date(start.getTime() - pad);
const limit = new Date(end.getTime() + pad);

let prev = tithi(cursor);
let winStart = prev === 10 || prev === 25 ? cursor : null;
cursor = new Date(cursor.getTime() + STEP);
const occs = [];
while (cursor <= limit) {
  const t = tithi(cursor);
  const cur = t === 10 || t === 25;
  const prv = prev === 10 || prev === 25;
  if (cur && !prv) winStart = new Date(cursor);
  else if (!cur && prv && winStart) {
    const mid = new Date((winStart.getTime() + cursor.getTime()) / 2);
    if (mid >= start && mid < end) {
      occs.push({
        date: dayStartTz(mid).toLocaleDateString("en-US", {
          weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: TZ,
        }),
        paksha: prev === 10 ? "shukla" : "krishna",
      });
    }
    winStart = null;
  }
  prev = t;
  cursor = new Date(cursor.getTime() + STEP);
}
console.log(`Found ${occs.length} Ekadashis in the next ~13 months (IST):`);
occs.forEach((e) => console.log(`  ${e.date}  (${e.paksha})`));
