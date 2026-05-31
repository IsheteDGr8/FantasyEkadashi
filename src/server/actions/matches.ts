"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildNextRound } from "@/server/lib/bracket";
import { getNextEkadashi } from "@/lib/ekadashi";
import type { MatchStatus, SubmissionSource } from "@/lib/supabase/types";

const SubmitSchema = z.object({
  matchId: z.string().uuid(),
  screenTimeMinutes: z.coerce.number().int().min(0).max(24 * 60),
  screenshotPath: z.string().nullable().optional(),
  source: z.enum(["ocr", "manual", "mixed"]).default("manual"),
});

export async function submitScreenTime(formData: FormData) {
  const parsed = SubmitSchema.parse({
    matchId: formData.get("matchId"),
    screenTimeMinutes: formData.get("screenTimeMinutes"),
    screenshotPath: formData.get("screenshotPath") || null,
    source: formData.get("source") || "manual",
  });

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/sign-in");
  const userId = userData.user.id;

  const admin = createAdminClient();

  const { data: match, error: matchErr } = await admin
    .from("matches")
    .select("*")
    .eq("id", parsed.matchId)
    .single();
  if (matchErr || !match) throw new Error("Match not found.");
  if (match.player_a !== userId && match.player_b !== userId) {
    throw new Error("You're not a player in this match.");
  }
  if (match.status === "completed" || match.status === "walkover") {
    throw new Error("This match is already decided.");
  }

  // Upsert the player's submission.
  const { error: upsertErr } = await admin.from("submissions").upsert(
    {
      match_id: parsed.matchId,
      player_id: userId,
      screen_time_minutes: parsed.screenTimeMinutes,
      screenshot_path: parsed.screenshotPath ?? null,
      source: parsed.source as SubmissionSource,
    },
    { onConflict: "match_id,player_id" },
  );
  if (upsertErr) throw new Error(upsertErr.message);

  // If both players have now submitted, decide the match (unless disputed).
  await tryResolveMatch(parsed.matchId);

  revalidatePath(`/matches/${parsed.matchId}`);
  revalidatePath(`/leagues/${match.league_id}`);
  revalidatePath("/dashboard");
}

const DisputeSchema = z.object({
  matchId: z.string().uuid(),
  note: z.string().trim().max(500).optional(),
});

export async function disputeOpponentSubmission(formData: FormData) {
  const parsed = DisputeSchema.parse({
    matchId: formData.get("matchId"),
    note: formData.get("note") || undefined,
  });

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/sign-in");
  const userId = userData.user.id;

  const admin = createAdminClient();
  const { data: match } = await admin
    .from("matches")
    .select("league_id, player_a, player_b")
    .eq("id", parsed.matchId)
    .single();
  if (!match) throw new Error("Match not found.");
  if (match.player_a !== userId && match.player_b !== userId) {
    throw new Error("You're not in this match.");
  }
  const opponentId =
    match.player_a === userId ? match.player_b : match.player_a;
  if (!opponentId) throw new Error("No opponent to dispute.");

  // Mark opponent's submission as disputed.
  await admin
    .from("submissions")
    .update({ disputed: true, dispute_note: parsed.note ?? null })
    .eq("match_id", parsed.matchId)
    .eq("player_id", opponentId);

  await admin
    .from("matches")
    .update({ status: "pending_review" as MatchStatus })
    .eq("id", parsed.matchId);

  revalidatePath(`/matches/${parsed.matchId}`);
  revalidatePath(`/leagues/${match.league_id}`);
}

/**
 * League creator can override a disputed match by declaring a winner.
 */
const ResolveSchema = z.object({
  matchId: z.string().uuid(),
  winnerId: z.string().uuid(),
});

export async function creatorResolveDispute(formData: FormData) {
  const parsed = ResolveSchema.parse({
    matchId: formData.get("matchId"),
    winnerId: formData.get("winnerId"),
  });

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/sign-in");

  const admin = createAdminClient();
  const { data: match } = await admin
    .from("matches")
    .select("league_id, player_a, player_b")
    .eq("id", parsed.matchId)
    .single();
  if (!match) throw new Error("Match not found.");
  const { data: league } = await admin
    .from("leagues")
    .select("created_by")
    .eq("id", match.league_id)
    .single();
  if (!league || league.created_by !== userData.user.id) {
    throw new Error("Only the league creator can resolve disputes.");
  }
  if (parsed.winnerId !== match.player_a && parsed.winnerId !== match.player_b) {
    throw new Error("Winner must be one of the two players.");
  }

  await admin
    .from("matches")
    .update({ winner_id: parsed.winnerId, status: "completed" as MatchStatus })
    .eq("id", parsed.matchId);

  await maybeAdvanceRound(match.league_id);
  revalidatePath(`/leagues/${match.league_id}`);
  revalidatePath(`/matches/${parsed.matchId}`);
}

/**
 * Try to auto-resolve a match after a new submission. Picks the lower time.
 * If the opponent disputed, leaves it pending_review for human action.
 */
async function tryResolveMatch(matchId: string) {
  const admin = createAdminClient();
  const { data: match } = await admin
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .single();
  if (!match) return;
  if (match.status === "completed" || match.status === "walkover") return;
  if (!match.player_a || !match.player_b) return; // bye

  const { data: subs } = await admin
    .from("submissions")
    .select("player_id, screen_time_minutes, disputed")
    .eq("match_id", matchId);
  if (!subs || subs.length < 2) {
    // Only one submission so far — flip status to awaiting_submissions to
    // signal the other player to submit.
    await admin
      .from("matches")
      .update({ status: "awaiting_submissions" as MatchStatus })
      .eq("id", matchId);
    return;
  }

  if (subs.some((s) => s.disputed)) {
    await admin
      .from("matches")
      .update({ status: "pending_review" as MatchStatus })
      .eq("id", matchId);
    return;
  }

  const [s1, s2] = subs;
  let winner: string;
  if (s1.screen_time_minutes < s2.screen_time_minutes) winner = s1.player_id;
  else if (s2.screen_time_minutes < s1.screen_time_minutes) winner = s2.player_id;
  else {
    // Tie — flag for review.
    await admin
      .from("matches")
      .update({ status: "pending_review" as MatchStatus })
      .eq("id", matchId);
    return;
  }

  await admin
    .from("matches")
    .update({ winner_id: winner, status: "completed" as MatchStatus })
    .eq("id", matchId);

  // Mark loser as eliminated.
  const loser = winner === match.player_a ? match.player_b : match.player_a;
  if (loser) {
    await admin
      .from("league_members")
      .update({ eliminated_at: new Date().toISOString() })
      .eq("league_id", match.league_id)
      .eq("user_id", loser);
  }

  await maybeAdvanceRound(match.league_id);
}

/**
 * If every match in the current round is completed, generate the next round.
 */
async function maybeAdvanceRound(leagueId: string) {
  const admin = createAdminClient();
  const { data: league } = await admin
    .from("leagues")
    .select("id, current_round, timezone, status")
    .eq("id", leagueId)
    .single();
  if (!league) return;
  if (league.status !== "active") return;

  const { data: roundMatches } = await admin
    .from("matches")
    .select("id, winner_id, status")
    .eq("league_id", leagueId)
    .eq("round", league.current_round);
  if (!roundMatches || roundMatches.length === 0) return;

  const incomplete = roundMatches.filter((m) => m.status !== "completed");
  if (incomplete.length > 0) return;

  const winners = roundMatches
    .map((m) => m.winner_id)
    .filter((w): w is string => !!w);

  if (winners.length === 1) {
    await admin
      .from("leagues")
      .update({ status: "completed" })
      .eq("id", leagueId);
    return;
  }

  const { matches: nextMatches } = buildNextRound(winners);
  if (nextMatches.length === 0) return;

  const nextRound = league.current_round + 1;
  // Schedule on the next Ekadashi after today.
  const nextEk = getNextEkadashi(new Date(), league.timezone, false);
  const ekDate = nextEk.date.toISOString().slice(0, 10);

  const rows = nextMatches.map(([a, b]) => ({
    league_id: leagueId,
    round: nextRound,
    ekadashi_date: ekDate,
    player_a: a,
    player_b: b,
    status: "scheduled" as MatchStatus,
  }));
  await admin.from("matches").insert(rows);
  await admin
    .from("leagues")
    .update({ current_round: nextRound })
    .eq("id", leagueId);
}
