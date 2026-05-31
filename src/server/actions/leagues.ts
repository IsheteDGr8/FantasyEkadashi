"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateInviteCode } from "@/lib/utils";
import { getNextEkadashi, DEFAULT_TIMEZONE } from "@/lib/ekadashi";
import { buildRound1 } from "@/server/lib/bracket";

const CreateLeagueSchema = z.object({
  name: z.string().trim().min(2).max(60),
  timezone: z.string().default(DEFAULT_TIMEZONE),
});

export async function createLeague(formData: FormData) {
  const parsed = CreateLeagueSchema.parse({
    name: formData.get("name"),
    timezone: formData.get("timezone") || DEFAULT_TIMEZONE,
  });

  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) redirect("/sign-in");

  const admin = createAdminClient();

  // Make a few attempts in case of code collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateInviteCode();
    const { data, error } = await admin
      .from("leagues")
      .insert({
        name: parsed.name,
        timezone: parsed.timezone,
        invite_code: code,
        created_by: userData.user.id,
      })
      .select("id")
      .single();

    if (!error && data) {
      // Auto-add creator as a member.
      await admin.from("league_members").insert({
        league_id: data.id,
        user_id: userData.user.id,
      });
      revalidatePath("/dashboard");
      redirect(`/leagues/${data.id}`);
    }
    // 23505 = unique_violation
    if (error && error.code !== "23505") {
      throw new Error(error.message);
    }
  }
  throw new Error("Could not allocate an invite code; please try again.");
}

const JoinLeagueSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(4)
    .max(12)
    .regex(/^[A-Z0-9]+$/, "Invite codes are letters and numbers"),
});

export async function joinLeague(formData: FormData) {
  const parsed = JoinLeagueSchema.parse({ code: formData.get("code") });

  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) redirect("/sign-in");

  const admin = createAdminClient();
  const { data: league, error: lookupErr } = await admin
    .from("leagues")
    .select("id, status")
    .eq("invite_code", parsed.code)
    .maybeSingle();

  if (lookupErr) throw new Error(lookupErr.message);
  if (!league) throw new Error("No league with that invite code.");
  if (league.status !== "open") {
    throw new Error(
      "That league has already started; you can't join mid-tournament.",
    );
  }

  const { error: joinErr } = await admin
    .from("league_members")
    .insert({ league_id: league.id, user_id: userData.user.id })
    .select();
  // Duplicate insert means user is already a member — treat as success.
  if (joinErr && joinErr.code !== "23505") {
    throw new Error(joinErr.message);
  }

  revalidatePath("/dashboard");
  redirect(`/leagues/${league.id}`);
}

export async function leaveLeague(leagueId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/sign-in");

  const admin = createAdminClient();
  const { data: league } = await admin
    .from("leagues")
    .select("status, created_by")
    .eq("id", leagueId)
    .single();

  if (!league) throw new Error("League not found.");
  if (league.status !== "open") {
    throw new Error("You can't leave a tournament after it has started.");
  }
  if (league.created_by === userData.user.id) {
    throw new Error("Creators can't leave their own league; delete it instead.");
  }

  await admin
    .from("league_members")
    .delete()
    .eq("league_id", leagueId)
    .eq("user_id", userData.user.id);

  revalidatePath(`/leagues/${leagueId}`);
  revalidatePath("/dashboard");
}

/**
 * Lock the league and create round-1 matches. Only the creator can call.
 */
export async function startLeague(leagueId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/sign-in");

  const admin = createAdminClient();
  const { data: league, error: leagueErr } = await admin
    .from("leagues")
    .select("id, status, created_by, timezone")
    .eq("id", leagueId)
    .single();
  if (leagueErr || !league) throw new Error("League not found.");
  if (league.created_by !== userData.user.id) {
    throw new Error("Only the league creator can start the tournament.");
  }
  if (league.status !== "open") {
    throw new Error("This league has already started.");
  }

  const { data: members, error: memErr } = await admin
    .from("league_members")
    .select("user_id")
    .eq("league_id", leagueId);
  if (memErr) throw new Error(memErr.message);
  if (!members || members.length < 2) {
    throw new Error("Need at least 2 players to start a tournament.");
  }

  const userIds = members.map((m) => m.user_id);
  const { matches, byes } = buildRound1(userIds);

  const nextEk = getNextEkadashi(new Date(), league.timezone);
  const ekDate = nextEk.date.toISOString().slice(0, 10); // YYYY-MM-DD

  // Insert matches for round 1.
  const matchRows = matches.map(([a, b]) => ({
    league_id: leagueId,
    round: 1,
    ekadashi_date: ekDate,
    player_a: a,
    player_b: b,
    status: "scheduled" as const,
  }));
  // Insert bye placeholders so the bracket shows them advancing.
  // We model byes as a match with null player_b and winner_id = player_a.
  const byeRows = byes.map((a) => ({
    league_id: leagueId,
    round: 1,
    ekadashi_date: ekDate,
    player_a: a,
    player_b: null,
    winner_id: a,
    status: "completed" as const,
  }));

  const { error: insertErr } = await admin
    .from("matches")
    .insert([...matchRows, ...byeRows]);
  if (insertErr) throw new Error(insertErr.message);

  await admin
    .from("leagues")
    .update({ status: "active", current_round: 1 })
    .eq("id", leagueId);

  revalidatePath(`/leagues/${leagueId}`);
  revalidatePath("/dashboard");
}
