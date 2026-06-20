import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Crown, Copy, Users, Play, Trophy, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth";
import { Card, CardBody, Badge } from "@/components/ui";
import { Bracket, type MatchView } from "@/components/Bracket";
import { Leaderboard, type LeaderboardRow } from "@/components/Leaderboard";
import { CopyButton } from "@/components/CopyButton";
import { ActionButton } from "@/components/ActionButton";
import {
  startTournament,
  leaveGroup,
  removeMember,
} from "@/server/actions/groups";
import { formatDate, formatMinutes } from "@/lib/utils";
import { SetupRequiredScreen, supabaseConfigured } from "@/components/SetupRequired";
import type { Submission } from "@/lib/supabase/types";

export const metadata = { title: "Group" };

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string }>;
}

export default async function GroupPage({ params, searchParams }: PageProps) {
  if (!supabaseConfigured()) return <SetupRequiredScreen />;
  const { id } = await params;
  const { date: selectedDateParam } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/sign-in");
  const userId = profile.id;

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: group, error } = await supabase
    .from("groups")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !group) notFound();

  const { data: members } = await supabase
    .from("group_members")
    .select("user_id, eliminated_at")
    .eq("group_id", id);
  const memberIds = members?.map((m) => m.user_id) ?? [];
  const { data: profiles } = memberIds.length
    ? await admin.from("profiles").select("id, display_name").in("id", memberIds)
    : { data: [] };
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));
  const eliminatedSet = new Set(
    (members ?? []).filter((m) => m.eliminated_at).map((m) => m.user_id),
  );

  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .eq("group_id", id)
    .order("round", { ascending: true })
    .order("created_at", { ascending: true });
  const matchIds = (matches ?? []).map((m) => m.id);

  const { data: submissions } = matchIds.length
    ? await supabase.from("submissions").select("*").in("match_id", matchIds)
    : { data: [] };

  const isAdmin = group.admin_id === userId;
  const isMember = memberIds.includes(userId);
  const memberCount = memberIds.length;

  // Champion (when completed): winner of the highest round.
  let champion: string | null = null;
  if (group.status === "completed" && matches && matches.length) {
    const maxRound = Math.max(...matches.map((m) => m.round));
    champion = matches.find((m) => m.round === maxRound && m.winner_id)?.winner_id ?? null;
  }

  // Ekadashi dates that have matches, newest first.
  const ekadashiDates = Array.from(new Set((matches ?? []).map((m) => m.ekadashi_date))).sort(
    (a, b) => (a < b ? 1 : -1),
  );
  const selectedDate =
    selectedDateParam && ekadashiDates.includes(selectedDateParam)
      ? selectedDateParam
      : ekadashiDates[0];

  // Build per-Ekadashi leaderboard rows for the selected date.
  const subByMatchPlayer = new Map<string, Submission>();
  (submissions ?? []).forEach((s) => subByMatchPlayer.set(`${s.match_id}:${s.player_id}`, s));

  let leaderboardRows: LeaderboardRow[] = [];
  if (selectedDate) {
    const dateMatches = (matches ?? []).filter((m) => m.ekadashi_date === selectedDate);
    const rows: LeaderboardRow[] = [];
    for (const m of dateMatches) {
      const sideIds = [m.player_a, m.player_b].filter(Boolean) as string[];
      for (const pid of sideIds) {
        const sub = subByMatchPlayer.get(`${m.id}:${pid}`);
        const lost =
          m.status === "completed" && m.player_b != null && m.winner_id !== pid;
        rows.push({
          userId: pid,
          name: nameById.get(pid) ?? "Player",
          totalMin: sub ? sub.total_min : null,
          lost,
          isMe: pid === userId,
          breakdown: sub
            ? {
                social: Math.max(0, sub.social_min - sub.whatsapp_min),
                games: sub.games_min,
                entertainment: sub.entertainment_min,
                creativity: sub.creativity_min,
                whatsapp: sub.whatsapp_min,
              }
            : undefined,
        });
      }
    }
    leaderboardRows = rows;
  }

  // All-time standings: wins + average competed screen time.
  const winsByPlayer = new Map<string, number>();
  (matches ?? []).forEach((m) => {
    if (m.status === "completed" && m.winner_id && m.player_b != null) {
      winsByPlayer.set(m.winner_id, (winsByPlayer.get(m.winner_id) ?? 0) + 1);
    }
  });
  const totalsByPlayer = new Map<string, number[]>();
  (submissions ?? []).forEach((s) => {
    const arr = totalsByPlayer.get(s.player_id) ?? [];
    arr.push(s.total_min);
    totalsByPlayer.set(s.player_id, arr);
  });
  const standings = memberIds
    .map((pid) => {
      const totals = totalsByPlayer.get(pid) ?? [];
      const avg = totals.length
        ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length)
        : null;
      return {
        userId: pid,
        name: nameById.get(pid) ?? "Player",
        wins: winsByPlayer.get(pid) ?? 0,
        avg,
        eliminated: eliminatedSet.has(pid),
        isMe: pid === userId,
      };
    })
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (a.avg === null) return 1;
      if (b.avg === null) return -1;
      return a.avg - b.avg;
    });

  const bracketMatches: MatchView[] = (matches ?? []).map((m) => ({
    id: m.id,
    round: m.round,
    status: m.status,
    winnerId: m.winner_id,
    playerA: m.player_a ? { id: m.player_a, name: nameById.get(m.player_a) ?? "?" } : null,
    playerB: m.player_b ? { id: m.player_b, name: nameById.get(m.player_b) ?? "?" } : null,
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted">Group</p>
          <h1 className="text-3xl font-semibold mt-1">{group.name}</h1>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={group.status === "active" ? "accent" : group.status === "completed" ? "success" : "muted"}>
              {group.status}
            </Badge>
            <span className="text-sm text-muted">
              {memberCount} {memberCount === 1 ? "player" : "players"} · {group.timezone}
            </span>
          </div>
        </div>
        {group.status === "open" && (
          <div className="flex gap-2">
            {isAdmin ? (
              <ActionButton action={startTournament.bind(null, group.id)} disabled={memberCount < 2}>
                <Play size={16} /> Start tournament
              </ActionButton>
            ) : isMember ? (
              <ActionButton variant="danger" action={leaveGroup.bind(null, group.id)} confirm="Leave this group?">
                Leave group
              </ActionButton>
            ) : null}
          </div>
        )}
      </header>

      {group.status === "open" && (
        <Card className="border-accent/30">
          <CardBody className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted">Invite code</p>
              <p className="mt-1 font-mono text-2xl tracking-[0.4em]">{group.join_code}</p>
            </div>
            <CopyButton text={group.join_code}><Copy size={16} /> Copy</CopyButton>
          </CardBody>
        </Card>
      )}

      {champion && nameById.has(champion) && (
        <Card className="border-accent">
          <CardBody className="flex items-center gap-4">
            <Crown size={32} className="text-accent" />
            <div>
              <p className="text-xs uppercase tracking-wider text-muted">Champion</p>
              <p className="text-xl font-semibold">{nameById.get(champion)}</p>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Players + admin roster controls */}
      <section>
        <h2 className="text-sm uppercase tracking-wider text-muted flex items-center gap-2 mb-3">
          <Users size={14} /> Players
        </h2>
        <div className="flex flex-wrap gap-2">
          {memberIds.map((uid) => (
            <span key={uid} className="inline-flex items-center gap-1">
              <Badge
                variant={eliminatedSet.has(uid) ? "muted" : "default"}
                className={eliminatedSet.has(uid) ? "line-through opacity-60" : ""}
              >
                {nameById.get(uid) ?? "Player"}
                {uid === userId && <span className="text-accent ml-1">(you)</span>}
                {uid === group.admin_id && <span className="text-accent ml-1">★</span>}
              </Badge>
              {isAdmin && group.status === "open" && uid !== userId && (
                <ActionButton
                  size="sm"
                  variant="ghost"
                  action={removeMember.bind(null, group.id, uid)}
                  confirm="Remove this player?"
                >
                  ✕
                </ActionButton>
              )}
            </span>
          ))}
        </div>
        {group.status === "open" && memberCount < 2 && (
          <p className="text-sm text-muted mt-3">Need at least 2 players to start.</p>
        )}
      </section>

      {/* Per-Ekadashi leaderboard */}
      {selectedDate && (
        <section>
          <h2 className="text-sm uppercase tracking-wider text-muted flex items-center gap-2 mb-3">
            <Calendar size={14} /> Ekadashi leaderboard
          </h2>
          {ekadashiDates.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {ekadashiDates.map((d) => (
                <Link
                  key={d}
                  href={`/groups/${group.id}?date=${d}`}
                  className={`text-xs rounded-full px-3 py-1 border transition ${
                    d === selectedDate
                      ? "border-accent text-accent bg-accent/10"
                      : "border-border text-muted hover:text-foreground"
                  }`}
                >
                  {formatDate(new Date(d + "T00:00:00"), group.timezone)}
                </Link>
              ))}
            </div>
          )}
          <Leaderboard rows={leaderboardRows} showBreakdown />
          <p className="mt-2 text-xs text-muted">
            S/G/E/C = Social (after WhatsApp) / Games / Entertainment / Creativity, in minutes.
          </p>
        </section>
      )}

      {/* Bracket */}
      {bracketMatches.length > 0 && (
        <section>
          <h2 className="text-sm uppercase tracking-wider text-muted mb-3">Bracket</h2>
          <Bracket matches={bracketMatches} currentUserId={userId} />
        </section>
      )}

      {/* All-time standings */}
      {memberCount > 0 && (
        <section>
          <h2 className="text-sm uppercase tracking-wider text-muted flex items-center gap-2 mb-3">
            <Trophy size={14} /> All-time standings
          </h2>
          <div className="overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-muted">
                <tr>
                  <th className="text-left font-medium px-3 py-2 w-10">#</th>
                  <th className="text-left font-medium px-3 py-2">Player</th>
                  <th className="text-right font-medium px-3 py-2">Wins</th>
                  <th className="text-right font-medium px-3 py-2">Avg time</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((s, i) => (
                  <tr key={s.userId} className={`border-t border-border/60 ${s.isMe ? "bg-accent/5" : ""}`}>
                    <td className="px-3 py-2 text-muted">{i + 1}</td>
                    <td className="px-3 py-2">
                      <span className={`font-medium ${s.eliminated ? "line-through opacity-60" : ""}`}>
                        {s.name}
                      </span>
                      {s.isMe && <span className="text-accent ml-1.5 text-xs">(you)</span>}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{s.wins}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {s.avg === null ? <span className="text-muted">—</span> : formatMinutes(s.avg)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="pt-2">
        <Link href="/dashboard" className="text-sm text-muted hover:text-foreground">
          ← Back to dashboard
        </Link>
      </div>
    </div>
  );
}
