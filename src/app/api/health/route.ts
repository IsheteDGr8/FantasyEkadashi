import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Lightweight health check that also touches the database. Hit this daily
 * (via the GitHub Actions cron in .github/workflows/keepalive.yml) so the
 * Supabase free tier doesn't pause the project between Ekadashis.
 */
export async function GET() {
  const startedAt = Date.now();
  try {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      return NextResponse.json({ ok: true, db: "not_configured" });
    }
    const admin = createAdminClient();
    const { error } = await admin
      .from("groups")
      .select("id", { count: "exact", head: true });
    if (error) {
      return NextResponse.json(
        { ok: false, db: "error", message: error.message },
        { status: 503 },
      );
    }
    return NextResponse.json({
      ok: true,
      db: "reachable",
      ms: Date.now() - startedAt,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : "unknown" },
      { status: 503 },
    );
  }
}
