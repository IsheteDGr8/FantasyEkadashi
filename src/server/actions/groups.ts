"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateJoinCode } from "@/lib/utils";
import { getNextEkadashi, DEFAULT_TIMEZONE } from "@/lib/ekadashi";
import { buildPairings } from "@/server/lib/bracket";

export type ActionResult = { error: string } | { ok: true };

async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/sign-in");
  return data.user;
}

const CreateGroupSchema = z.object({
  name: z.string().trim().min(2).max(60),
  timezone: z.string().default(DEFAULT_TIMEZONE),
});

export async function createGroup(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = CreateGroupSchema.safeParse({
    name: formData.get("name"),
    timezone: formData.get("timezone") || DEFAULT_TIMEZONE,
  });
  if (!parsed.success) return { error: "Please enter a valid group name." };

  const admin = createAdminClient();

  // Only admins may create groups.
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) {
    return { error: "Only admins can create groups. Ask the app owner to grant access." };
  }

  let groupId: string | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await admin
      .from("groups")
      .insert({
        name: parsed.data.name,
        timezone: parsed.data.timezone,
        join_code: generateJoinCode(),
        admin_id: user.id,
      })
      .select("id")
      .single();
    if (!error && data) {
      groupId = data.id;
      break;
    }
    if (error && error.code !== "23505") return { error: error.message };
  }
  if (!groupId) return { error: "Could not allocate a join code; try again." };

  await admin.from("group_members").insert({ group_id: groupId, user_id: user.id });
  revalidatePath("/dashboard");
  redirect(`/groups/${groupId}`);
}

const JoinSchema = z.object({
  code: z.string().trim().toUpperCase().min(4).max(12).regex(/^[A-Z0-9]+$/),
});

export async function joinGroup(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = JoinSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) return { error: "Enter a valid invite code." };

  const admin = createAdminClient();
  const { data: group } = await admin
    .from("groups")
    .select("id, status")
    .eq("join_code", parsed.data.code)
    .maybeSingle();
  if (!group) return { error: "No group with that code." };
  if (group.status !== "open") {
    return { error: "That group has already started; you can't join mid-tournament." };
  }

  const { error } = await admin
    .from("group_members")
    .insert({ group_id: group.id, user_id: user.id });
  if (error && error.code !== "23505") return { error: error.message };

  revalidatePath("/dashboard");
  redirect(`/groups/${group.id}`);
}

export async function leaveGroup(groupId: string): Promise<ActionResult> {
  const user = await requireUser();
  const admin = createAdminClient();
  const { data: group } = await admin
    .from("groups")
    .select("status, admin_id")
    .eq("id", groupId)
    .single();
  if (!group) return { error: "Group not found." };
  if (group.status !== "open") return { error: "Can't leave after the tournament starts." };
  if (group.admin_id === user.id) return { error: "Admins can't leave their own group." };

  await admin
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", user.id);
  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Admin removes a member before the tournament starts. */
export async function removeMember(
  groupId: string,
  memberId: string,
): Promise<ActionResult> {
  const user = await requireUser();
  const admin = createAdminClient();
  const { data: group } = await admin
    .from("groups")
    .select("status, admin_id")
    .eq("id", groupId)
    .single();
  if (!group) return { error: "Group not found." };
  if (group.admin_id !== user.id) return { error: "Only the admin can remove members." };
  if (group.status !== "open") return { error: "Can't change the roster after start." };
  if (memberId === user.id) return { error: "You can't remove yourself." };

  await admin
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", memberId);
  revalidatePath(`/groups/${groupId}`);
  return { ok: true };
}

/** Admin locks the roster and generates round 1 on the next Ekadashi. */
export async function startTournament(groupId: string): Promise<ActionResult> {
  const user = await requireUser();
  const admin = createAdminClient();

  const { data: group } = await admin
    .from("groups")
    .select("id, status, admin_id, timezone")
    .eq("id", groupId)
    .single();
  if (!group) return { error: "Group not found." };
  if (group.admin_id !== user.id) return { error: "Only the admin can start the tournament." };
  if (group.status !== "open") return { error: "This group has already started." };

  const { data: members } = await admin
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId);
  if (!members || members.length < 2) return { error: "Need at least 2 players to start." };

  const { matches, byes } = buildPairings(members.map((m) => m.user_id));
  const ekDate = getNextEkadashi(new Date(), group.timezone).date
    .toISOString()
    .slice(0, 10);

  const matchRows = matches.map(([a, b]) => ({
    group_id: groupId,
    round: 1,
    ekadashi_date: ekDate,
    player_a: a,
    player_b: b,
    status: "scheduled" as const,
  }));
  const byeRows = byes.map((a) => ({
    group_id: groupId,
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
  if (insertErr) return { error: insertErr.message };

  await admin
    .from("groups")
    .update({ status: "active", current_round: 1 })
    .eq("id", groupId);

  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}
