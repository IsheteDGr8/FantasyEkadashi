import { NextResponse } from "next/server";
import { generateDueMatchupsAll } from "@/server/lib/matchmaking";
import { closeDueSubmissionsAll } from "@/server/lib/rounds";

export const dynamic = "force-dynamic";

/**
 * Generates any due Ekadashi matchups for all active leagues. Safe to call
 * often — it's idempotent (won't duplicate a date's matchups). Triggered daily
 * by .github/workflows/keepalive.yml, and also lazily on page loads.
 *
 * If CRON_SECRET is set, require ?key=<secret> (or x-cron-key header).
 */
export async function GET(req: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    if (secret) {
      const url = new URL(req.url);
      const provided = url.searchParams.get("key") ?? req.headers.get("x-cron-key");
      if (provided !== secret) {
        return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
      }
    }
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      return NextResponse.json({ ok: true, note: "not_configured" });
    }
    const result = await generateDueMatchupsAll();
    const closed = await closeDueSubmissionsAll();
    return NextResponse.json({ ok: true, ...result, ...closed });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "unknown" },
      { status: 500 },
    );
  }
}
