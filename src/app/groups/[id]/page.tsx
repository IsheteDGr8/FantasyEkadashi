import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Copy, Users, Play, Trophy, Calendar, Trash2, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth";
import {
  getNextEkadashi,
  getMatchupGenerationTime,
  getJoinCutoff,
} from "@/lib/ekadashi";
import { generateMatchupsForGroup } from "@/server/lib/matchmaking";
import { Card, CardBody, Badge } from "@/components/ui";
import { Bracket, type MatchView } from "@/components/Bracket";
import { GroupTitle } from "@/components/GroupTitle";
import { Leaderboard, type LeaderboardRow } from "@/components/Leaderboard";
import { CopyButton } from "@/components/CopyButton";
import { ActionButton } from "@/components/ActionButton";
import {
  startTournament,
  leaveGroup,
  removeMember,
  deleteGroup,
} from "@/server/actions/groups";
import { formatDate, formatMinutes } from "@/lib/utils";
import { SetupRequiredScreen, supabaseConfigured } from "@/components/SetupRequired";
import type { Submission } from "@/lib/supabase/types";

export const metadata = { title: "League" };

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

  // Lazily generate any due Ekadashi matchups so they appear without waiting
  // for the daily cron (no-op if it's too early or already generated).
  if (group.status === "active") {
    await generateMatchupsForGroup(id);
  }

  const [{ data: members }, { data: matches }] = await Promise.all([
    supabase
      .from("group_members")
      .select("user_id, joined_at")
      .eq("group_id", id),
    supabase
      .from("matches")
      .select("*")
      .eq("group_id", id)
      .order("round", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  const memberIds = members?.map((m) => m.user_id) ?? [];
  const matchIds = (matches ?? []).map((m) => m.id);

  const [{ data: profiles }, { data: submissions }] = await Promise.all([
    memberIds.length
      ? admin.from("profiles").select("id, display_name").in("id", memberIds)
      : Promise.resolve({ data: [] as { id: string; display_name: string }[] }),
    matchIds.length
      ? supabase.from("submissions").select("*").in("match_id", matchIds)
      : Promise.resolve({ data: [] as Submission[] }),
  ]);

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));
  const tz = group.timezone;
  const isAdmin = group.admin_id === userId;
  const isMember = memberIds.includes(userId);
  const memberCount = memberIds.length;

  // --- Next Ekadashi schedule ---
  const nextEk = getNextEkadashi(new Date(), tz, true);
  const nextEkStr = nextEk.date.toISOString().slice(0, 10);
  const matchupTime = getMatchupGenerationTime(nextEk.date, tz);
  const joinCutoff = getJoinCutoff(nextEk.date, tz);
  const matchupsSetForNext = (matches ?? []).some((m) => m.ekadashi_date === nextEkStr);
  const fmtDT = (d: Date) =>
    d.toLocaleString("en-US", {
      timeZone: tz,
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  // --- Per-Ekadashi leaderboard ---
  const ekadashiDates = Array.from(new Set((matches ?? []).map((m) => m.ekadashi_date))).sort(
    (a, b) => (a < b ? 1 : -1),
  );
  const selectedDate =
    selectedDateParam && ekadashiDates.includes(selectedDateParam)
      ? selectedDateParam
      : ekadashiDates[0];

  const subByMatchPlayer = new Map<string, Submission>();
  (submissions ?? []).forEach((s) => subByMatchPlayer.set(`${s.match_id}:${s.player_id}`, s));

  let leaderboardRows: LeaderboardRow[] = [];
  if (selectedDate) {
    const dateMatches = (matches ?? []).filter((m) => m.ekadashi_date === selectedDate);
    const rows: LeaderboardRow[] = [];
    for (const m of dateMatches) {
      const sideIds = [m.player_a, m.player_b].filter(Boolean) as string[];
      for (const pid of sideIds) {
        if (m.player_b == null) continue; // bye players don't appear on the day's board
        const sub = subByMatchPlayer.get(`${m.id}:${pid}`);
        const lost = m.status === "completed" && m.winner_id !== pid;
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

  // --- All-time standings (wins / losses / byes / avg time) ---
  const stats = new Map<
    string,
    { wins: number; losses: number; byes: number; totals: number[] }
  >();
  memberIds.forEach((pid) => stats.set(pid, { wins: 0, losses: 0, byes: 0, totals: [] }));
  (matches ?? []).forEach((m) => {
    if (m.player_b == null) {
      const s = m.player_a && stats.get(m.player_a);
      if (s) s.byes += 1;
      return;
    }
    if (m.status !== "completed" || !m.winner_id) return;
    for (const pid of [m.player_a, m.player_b]) {
      if (!pid) continue;
      const s = stats.get(pid);
      if (!s) continue;
      if (m.winner_id === pid) s.wins += 1;
      else s.losses += 1;
    }
  });
  (submissions ?? []).forEach((s) => {
    stats.get(s.player_id)?.totals.push(s.total_min);
  });
  const standings = memberIds
    .map((pid) => {
      const s = stats.get(pid)!;
      const avg = s.totals.length
        ? Math.round(s.totals.reduce((a, b) => a + b, 0) / s.totals.length)
        : null;
      return {
        userId: pid,
        name: nameById.get(pid) ?? "Player",
        wins: s.wins,
        losses: s.losses,
        byes: s.byes,
        avg,
        isMe: pid === userId,
      };
    })
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (a.losses !== b.losses) return a.losses - b.losses;
      if (a.avg === null) return 1;
      if (b.avg === null) return -1;
      return a.avg - b.avg;
    });

  const bracketMatches: MatchView[] = (matches ?? []).map((m) => ({
    id: m.id,
    round: m.round,
    ekadashiDate: m.ekadashi_date,
    status: m.status,
    winnerId: m.winner_id,
    playerA: m.player_a ? { id: m.player_a, name: nameById.get(m.player_a) ?? "?" } : null,
    playerB: m.player_b ? { id: m.player_b, name: nameById.get(m.player_b) ?? "?" } : null,
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted">League</p>
          <GroupTitle groupId={group.id} name={group.name} canEdit={isAdmin} />
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={group.status === "active" ? "accent" : group.status === "completed" ? "success" : "muted"}>
              {group.status === "open" ? "not started" : group.status}
            </Badge>
            <span className="text-sm text-muted">
              {memberCount} {memberCount === 1 ? "player" : "players"} · {tz}
            </span>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          {group.status === "open" && isAdmin && (
            <ActionButton action={startTournament.bind(null, group.id)} disabled={memberCount < 2}>
              <Play size={16} /> Start league
            </ActionButton>
          )}
          {group.status === "open" && !isAdmin && isMember && (
            <ActionButton variant="danger" action={leaveGroup.bind(null, group.id)} confirm="Leave this league?">
              Leave
            </ActionButton>
          )}
          {isAdmin && (
            <ActionButton
              variant="danger"
              action={deleteGroup.bind(null, group.id)}
              confirm="Permanently delete this league and all its data? This cannot be undone."
            >
              <Trash2 size={16} /> Delete
            </ActionButton>
          )}
        </div>
      </header>

      {group.status !== "completed" && (
        <Card className="border-accent/30">
          <CardBody className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted">Invite code</p>
              <p className="mt-1 font-mono text-2xl tracking-[0.4em]">{group.join_code}</p>
              <p className="mt-1 text-xs text-muted">Anyone can join with this code, even after it starts.</p>
            </div>
            <CopyButton text={group.join_code}><Copy size={16} /> Copy</CopyButton>
          </CardBody>
        </Card>
      )}

      {group.status === "active" && (
        <Card>
          <CardBody className="space-y-1">
            <p className="text-xs uppercase tracking-wider text-muted flex items-center gap-2">
              <Clock size={14} /> Next Ekadashi
            </p>
            <p className="text-xl font-semibold">{formatDate(nextEk.date, tz)}</p>
            {matchupsSetForNext ? (
              <p className="text-sm text-success">Matchups are set for this Ekadashi.</p>
            ) : (
              <p className="text-sm text-muted">
                Matchups generate <span className="text-foreground">{fmtDT(matchupTime)}</span>.
                Join by <span className="text-foreground">{fmtDT(joinCutoff)}</span> to compete this round —
                later joiners get a bye and play the next one.
              </p>
            )}
          </CardBody>
        </Card>
      )}

      {/* Players */}
      <section>
        <h2 className="text-sm uppercase tracking-wider text-muted flex items-center gap-2 mb-3">
          <Users size={14} /> Players
        </h2>
        <div className="flex flex-wrap gap-2">
          {memberIds.map((uid) => (
            <span key={uid} className="inline-flex items-center gap-1">
              <Badge variant="default">
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
                  {formatDate(new Date(d + "T00:00:00"), tz)}
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

      {/* Matchups by Ekadashi */}
      {bracketMatches.length > 0 && (
        <section>
          <h2 className="text-sm uppercase tracking-wider text-muted mb-3">Matchups</h2>
          <Bracket matches={bracketMatches} currentUserId={userId} timeZone={tz} />
        </section>
      )}

      {/* All-time standings */}
      {memberCount > 0 && (
        <section>
          <h2 className="text-sm uppercase tracking-wider text-muted flex items-center gap-2 mb-3">
            <Trophy size={14} /> Standings
          </h2>
          <div className="overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-muted">
                <tr>
                  <th className="text-left font-medium px-3 py-2 w-10">#</th>
                  <th className="text-left font-medium px-3 py-2">Player</th>
                  <th className="text-right font-medium px-3 py-2">W–L</th>
                  <th className="text-right font-medium px-3 py-2 hidden sm:table-cell">Byes</th>
                  <th className="text-right font-medium px-3 py-2">Avg time</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((s, i) => (
                  <tr key={s.userId} className={`border-t border-border/60 ${s.isMe ? "bg-accent/5" : ""}`}>
                    <td className="px-3 py-2 text-muted">{i + 1}</td>
                    <td className="px-3 py-2">
                      <span className="font-medium">{s.name}</span>
                      {s.isMe && <span className="text-accent ml-1.5 text-xs">(you)</span>}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{s.wins}–{s.losses}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums hidden sm:table-cell">{s.byes}</td>
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
