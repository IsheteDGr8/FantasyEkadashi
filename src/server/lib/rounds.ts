import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSubmissionWindow, ekadashiDateToInstant } from "@/lib/ekadashi";
import type { MatchStatus } from "@/lib/supabase/types";

/**
 * Close out any matches whose submission window has passed. Anyone who didn't
 * submit is recorded as a no-show (scored as a full 24h / 1440 min), then the
 * match is decided: the lower total wins; an exact tie is left without a winner.
 *
 * Disputed matches (status 'pending_review') are skipped so an admin can rule.
 * Idempotent: completed matches are ignored and no-show rows use upsert.
 */
export async function closeDueSubmissionsForGroup(groupId: string): Promise<number> {
  const admin = createAdminClient();
  const { data: group } = await admin
    .from("groups")
    .select("id, timezone")
    .eq("id", groupId)
    .single();
  if (!group) return 0;

  const { data: matches } = await admin
    .from("matches")
    .select("id, ekadashi_date, player_a, player_b, status")
    .eq("group_id", groupId)
    .in("status", ["scheduled", "awaiting_submissions"]);
  if (!matches || matches.length === 0) return 0;

  const now = new Date();
  let closed = 0;

  for (const match of matches) {
    if (!match.player_a || !match.player_b) continue; // byes are already done
    const win = getSubmissionWindow(
      ekadashiDateToInstant(match.ekadashi_date, group.timezone),
      group.timezone,
    );
    if (now <= win.closesAt) continue; // window still open

    const { data: subs } = await admin
      .from("submissions")
      .select("player_id, total_min, disputed")
      .eq("match_id", match.id);
    const byPlayer = new Map((subs ?? []).map((s) => [s.player_id, s]));

    if ((subs ?? []).some((s) => s.disputed)) continue; // leave for admin

    // Record a no-show for anyone who never submitted.
    for (const pid of [match.player_a, match.player_b]) {
      if (!byPlayer.has(pid)) {
        await admin.from("submissions").upsert(
          { match_id: match.id, player_id: pid, no_show: true, source: "manual" },
          { onConflict: "match_id,player_id" },
        );
      }
    }

    // Re-read totals now that no-shows are filled in.
    const { data: finalSubs } = await admin
      .from("submissions")
      .select("player_id, total_min")
      .eq("match_id", match.id);
    if (!finalSubs || finalSubs.length < 2) continue;

    const [a, b] = finalSubs;
    const winnerId =
      a.total_min === b.total_min
        ? null
        : a.total_min < b.total_min
          ? a.player_id
          : b.player_id;

    await admin
      .from("matches")
      .update({ winner_id: winnerId, status: "completed" as MatchStatus })
      .eq("id", match.id);
    closed++;
  }

  return closed;
}

/** Close due submission windows for every active league (used by cron). */
export async function closeDueSubmissionsAll(): Promise<{ closed: number }> {
  const admin = createAdminClient();
  const { data: groups } = await admin
    .from("groups")
    .select("id")
    .eq("status", "active");
  let closed = 0;
  for (const g of groups ?? []) {
    closed += await closeDueSubmissionsForGroup(g.id);
  }
  return { closed };
}
