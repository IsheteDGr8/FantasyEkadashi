import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getNextEkadashiDateStr,
  ekadashiDateToInstant,
  getMatchupGenerationTime,
  getJoinCutoff,
} from "@/lib/ekadashi";
import { buildPairings } from "@/server/lib/bracket";
import type { MatchStatus } from "@/lib/supabase/types";

/**
 * Ongoing-league matchmaking.
 *
 * For a group, generate the next Ekadashi's matchups once we're past the
 * generation time (00:00 the day before). Players who joined on/before the
 * join cutoff (23:00 two days before) are paired; everyone else currently in
 * the group gets a bye for this Ekadashi (they're viewers and become eligible
 * next time). Idempotent: does nothing if matchups for that date already exist.
 *
 * Returns true if it created matchups.
 */
export async function generateMatchupsForGroup(groupId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data: group } = await admin
    .from("groups")
    .select("id, status, timezone, current_round")
    .eq("id", groupId)
    .single();
  if (!group || group.status !== "active") return false;

  const now = new Date();
  const { dateStr: ekDateStr } = getNextEkadashiDateStr(now);
  const ekInstant = ekadashiDateToInstant(ekDateStr, group.timezone);
  const matchupTime = getMatchupGenerationTime(ekInstant, group.timezone);
  if (now < matchupTime) return false; // too early to set matchups

  const { data: existing } = await admin
    .from("matches")
    .select("id")
    .eq("group_id", groupId)
    .eq("ekadashi_date", ekDateStr)
    .limit(1);
  if (existing && existing.length > 0) return false; // already generated

  const { data: members } = await admin
    .from("group_members")
    .select("user_id, joined_at")
    .eq("group_id", groupId);
  if (!members || members.length === 0) return false;

  // The founding round (first matchups ever for this league) pairs everyone
  // who's currently in. The join cutoff only separates late joiners on
  // subsequent rounds — otherwise founders who joined after the cutoff (e.g.
  // the league was started the same day) would all be handed byes.
  const isFoundingRound = group.current_round === 0;
  const cutoff = getJoinCutoff(ekInstant, group.timezone);
  const eligible = isFoundingRound
    ? members.map((m) => m.user_id)
    : members.filter((m) => new Date(m.joined_at) <= cutoff).map((m) => m.user_id);
  const ineligible = isFoundingRound
    ? []
    : members.filter((m) => new Date(m.joined_at) > cutoff).map((m) => m.user_id);

  if (eligible.length < 2 && ineligible.length === 0) return false;

  const round = group.current_round + 1;
  const { matches, byes } = buildPairings(eligible);

  const matchRows = matches.map(([a, b]) => ({
    group_id: groupId,
    round,
    ekadashi_date: ekDateStr,
    player_a: a,
    player_b: b,
    status: "scheduled" as MatchStatus,
  }));
  // Odd-eligible bye + everyone who joined too late = byes this Ekadashi.
  const byeRows = [...byes, ...ineligible].map((a) => ({
    group_id: groupId,
    round,
    ekadashi_date: ekDateStr,
    player_a: a,
    player_b: null,
    winner_id: a,
    status: "completed" as MatchStatus,
  }));

  if (matchRows.length === 0 && byeRows.length === 0) return false;

  const { error } = await admin
    .from("matches")
    .insert([...matchRows, ...byeRows]);
  if (error) return false;

  await admin.from("groups").update({ current_round: round }).eq("id", groupId);
  return true;
}

/** Run matchmaking for every active group (used by the cron endpoint). */
export async function generateDueMatchupsAll(): Promise<{ groups: number; generated: number }> {
  const admin = createAdminClient();
  const { data: groups } = await admin
    .from("groups")
    .select("id")
    .eq("status", "active");
  let generated = 0;
  for (const g of groups ?? []) {
    if (await generateMatchupsForGroup(g.id)) generated++;
  }
  return { groups: groups?.length ?? 0, generated };
}
