"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildPairings } from "@/server/lib/bracket";
import { getNextEkadashi } from "@/lib/ekadashi";
import type { MatchStatus, SubmissionSource } from "@/lib/supabase/types";

export type ActionResult = { error: string } | { ok: true };

async function requireUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/sign-in");
  return data.user.id;
}

const minute = z.coerce.number().int().min(0).max(1440);

const SubmitSchema = z.object({
  matchId: z.string().uuid(),
  social_min: minute,
  games_min: minute,
  entertainment_min: minute,
  creativity_min: minute,
  whatsapp_min: minute,
  screenshotPath: z.string().nullable().optional(),
  source: z.enum(["ocr", "manual", "mixed"]).default("manual"),
});

export async function submitScreenTime(formData: FormData): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = SubmitSchema.safeParse({
    matchId: formData.get("matchId"),
    social_min: formData.get("social_min"),
    games_min: formData.get("games_min"),
    entertainment_min: formData.get("entertainment_min"),
    creativity_min: formData.get("creativity_min"),
    whatsapp_min: formData.get("whatsapp_min"),
    screenshotPath: formData.get("screenshotPath") || null,
    source: formData.get("source") || "manual",
  });
  if (!parsed.success) return { error: "Please enter valid times (0–1440 minutes)." };

  const admin = createAdminClient();
  const { data: match } = await admin
    .from("matches")
    .select("*")
    .eq("id", parsed.data.matchId)
    .single();
  if (!match) return { error: "Match not found." };
  if (match.player_a !== userId && match.player_b !== userId) {
    return { error: "You're not a player in this match." };
  }
  if (match.status === "completed") return { error: "This match is already decided." };

  const { error: upsertErr } = await admin.from("submissions").upsert(
    {
      match_id: parsed.data.matchId,
      player_id: userId,
      social_min: parsed.data.social_min,
      games_min: parsed.data.games_min,
      entertainment_min: parsed.data.entertainment_min,
      creativity_min: parsed.data.creativity_min,
      whatsapp_min: parsed.data.whatsapp_min,
      screenshot_path: parsed.data.screenshotPath ?? null,
      source: parsed.data.source as SubmissionSource,
    },
    { onConflict: "match_id,player_id" },
  );
  if (upsertErr) return { error: upsertErr.message };

  await tryResolveMatch(parsed.data.matchId);
  revalidatePath(`/matches/${parsed.data.matchId}`);
  revalidatePath(`/groups/${match.group_id}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

const DisputeSchema = z.object({
  matchId: z.string().uuid(),
  note: z.string().trim().max(500).optional(),
});

export async function disputeOpponent(formData: FormData): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = DisputeSchema.safeParse({
    matchId: formData.get("matchId"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { error: "Invalid dispute." };

  const admin = createAdminClient();
  const { data: match } = await admin
    .from("matches")
    .select("group_id, player_a, player_b")
    .eq("id", parsed.data.matchId)
    .single();
  if (!match) return { error: "Match not found." };
  if (match.player_a !== userId && match.player_b !== userId) {
    return { error: "You're not in this match." };
  }
  const opponentId = match.player_a === userId ? match.player_b : match.player_a;
  if (!opponentId) return { error: "No opponent to dispute." };

  await admin
    .from("submissions")
    .update({ disputed: true, dispute_note: parsed.data.note ?? null })
    .eq("match_id", parsed.data.matchId)
    .eq("player_id", opponentId);
  await admin
    .from("matches")
    .update({ status: "pending_review" as MatchStatus })
    .eq("id", parsed.data.matchId);

  revalidatePath(`/matches/${parsed.data.matchId}`);
  revalidatePath(`/groups/${match.group_id}`);
  return { ok: true };
}

const ResolveSchema = z.object({
  matchId: z.string().uuid(),
  winnerId: z.string().uuid(),
});

/** Group admin declares the winner of a disputed/tied match. */
export async function adminResolveMatch(formData: FormData): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = ResolveSchema.safeParse({
    matchId: formData.get("matchId"),
    winnerId: formData.get("winnerId"),
  });
  if (!parsed.success) return { error: "Invalid resolution." };

  const admin = createAdminClient();
  const { data: match } = await admin
    .from("matches")
    .select("group_id, player_a, player_b")
    .eq("id", parsed.data.matchId)
    .single();
  if (!match) return { error: "Match not found." };

  const { data: group } = await admin
    .from("groups")
    .select("admin_id")
    .eq("id", match.group_id)
    .single();
  if (!group || group.admin_id !== userId) {
    return { error: "Only the group admin can resolve matches." };
  }
  if (parsed.data.winnerId !== match.player_a && parsed.data.winnerId !== match.player_b) {
    return { error: "Winner must be one of the two players." };
  }

  await finalizeMatch(parsed.data.matchId, parsed.data.winnerId);
  revalidatePath(`/matches/${parsed.data.matchId}`);
  revalidatePath(`/groups/${match.group_id}`);
  return { ok: true };
}

// --- internal helpers -------------------------------------------------------

async function tryResolveMatch(matchId: string) {
  const admin = createAdminClient();
  const { data: match } = await admin.from("matches").select("*").eq("id", matchId).single();
  if (!match || match.status === "completed") return;
  if (!match.player_a || !match.player_b) return; // bye

  const { data: subs } = await admin
    .from("submissions")
    .select("player_id, total_min, disputed")
    .eq("match_id", matchId);
  if (!subs || subs.length < 2) {
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
  if (s1.total_min === s2.total_min) {
    await admin
      .from("matches")
      .update({ status: "pending_review" as MatchStatus })
      .eq("id", matchId);
    return;
  }
  const winner = s1.total_min < s2.total_min ? s1.player_id : s2.player_id;
  await finalizeMatch(matchId, winner);
}

async function finalizeMatch(matchId: string, winnerId: string) {
  const admin = createAdminClient();
  const { data: match } = await admin.from("matches").select("*").eq("id", matchId).single();
  if (!match) return;

  await admin
    .from("matches")
    .update({ winner_id: winnerId, status: "completed" as MatchStatus })
    .eq("id", matchId);

  const loser = winnerId === match.player_a ? match.player_b : match.player_a;
  if (loser) {
    await admin
      .from("group_members")
      .update({ eliminated_at: new Date().toISOString() })
      .eq("group_id", match.group_id)
      .eq("user_id", loser);
  }
  await maybeAdvanceRound(match.group_id);
}

async function maybeAdvanceRound(groupId: string) {
  const admin = createAdminClient();
  const { data: group } = await admin
    .from("groups")
    .select("id, current_round, timezone, status")
    .eq("id", groupId)
    .single();
  if (!group || group.status !== "active") return;

  const { data: roundMatches } = await admin
    .from("matches")
    .select("id, winner_id, status")
    .eq("group_id", groupId)
    .eq("round", group.current_round);
  if (!roundMatches || roundMatches.length === 0) return;
  if (roundMatches.some((m) => m.status !== "completed")) return;

  const winners = roundMatches
    .map((m) => m.winner_id)
    .filter((w): w is string => !!w);

  if (winners.length <= 1) {
    await admin.from("groups").update({ status: "completed" }).eq("id", groupId);
    return;
  }

  const { matches, byes } = buildPairings(winners);
  const nextRound = group.current_round + 1;
  const ekDate = getNextEkadashi(new Date(), group.timezone, false).date
    .toISOString()
    .slice(0, 10);

  const matchRows = matches.map(([a, b]) => ({
    group_id: groupId,
    round: nextRound,
    ekadashi_date: ekDate,
    player_a: a,
    player_b: b,
    status: "scheduled" as MatchStatus,
  }));
  const byeRows = byes.map((a) => ({
    group_id: groupId,
    round: nextRound,
    ekadashi_date: ekDate,
    player_a: a,
    player_b: null,
    winner_id: a,
    status: "completed" as MatchStatus,
  }));
  await admin.from("matches").insert([...matchRows, ...byeRows]);
  await admin.from("groups").update({ current_round: nextRound }).eq("id", groupId);

  // A bye in the new round may immediately leave a single survivor; re-check.
  if (matchRows.length === 0) await maybeAdvanceRound(groupId);
}
