import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Crown, Copy, Users, Play } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, Button, Badge } from "@/components/ui";
import { Bracket } from "@/components/Bracket";
import { CopyButton } from "@/components/CopyButton";
import {
  startLeague,
  leaveLeague,
} from "@/server/actions/leagues";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "League" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LeaguePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/sign-in");
  const userId = userData.user.id;

  const { data: league, error } = await supabase
    .from("leagues")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !league) notFound();

  const { data: members } = await supabase
    .from("league_members")
    .select("user_id, eliminated_at")
    .eq("league_id", id);

  const memberIds = members?.map((m) => m.user_id) ?? [];
  const { data: memberProfiles } = memberIds.length
    ? await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", memberIds)
    : { data: [] };
  const profileNameById = new Map(
    (memberProfiles ?? []).map((p) => [p.id, p.display_name]),
  );

  const memberMap = new Map<
    string,
    { name: string; eliminated: boolean }
  >();
  members?.forEach((m) => {
    memberMap.set(m.user_id, {
      name: profileNameById.get(m.user_id) ?? "Player",
      eliminated: !!m.eliminated_at,
    });
  });

  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .eq("league_id", id)
    .order("round", { ascending: true })
    .order("created_at", { ascending: true });

  const isCreator = league.created_by === userId;
  const isMember = memberMap.has(userId);
  const memberCount = members?.length ?? 0;

  const champion =
    league.status === "completed" && matches && matches.length > 0
      ? matches.find(
          (m) =>
            m.round === Math.max(...matches.map((mm) => mm.round)) &&
            m.winner_id,
        )?.winner_id
      : null;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted">League</p>
          <h1 className="text-3xl font-semibold mt-1">{league.name}</h1>
          <div className="mt-2 flex items-center gap-2">
            <Badge
              variant={
                league.status === "active"
                  ? "accent"
                  : league.status === "completed"
                    ? "success"
                    : "muted"
              }
            >
              {league.status}
            </Badge>
            <span className="text-sm text-muted">
              {memberCount} {memberCount === 1 ? "player" : "players"} ·{" "}
              {league.timezone}
            </span>
          </div>
        </div>

        {league.status === "open" && (
          <div className="flex gap-2">
            {isCreator ? (
              <form action={async () => {
                "use server";
                await startLeague(league.id);
              }}>
                <Button type="submit" disabled={memberCount < 2}>
                  <Play size={16} /> Start tournament
                </Button>
              </form>
            ) : isMember ? (
              <form action={async () => {
                "use server";
                await leaveLeague(league.id);
              }}>
                <Button type="submit" variant="danger">
                  Leave league
                </Button>
              </form>
            ) : null}
          </div>
        )}
      </header>

      {/* Invite code (if open) */}
      {league.status === "open" && (
        <Card className="border-accent/30">
          <CardBody className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted">
                Invite code
              </p>
              <p className="mt-1 font-mono text-2xl tracking-[0.4em]">
                {league.invite_code}
              </p>
            </div>
            <CopyButton text={league.invite_code}>
              <Copy size={16} /> Copy
            </CopyButton>
          </CardBody>
        </Card>
      )}

      {/* Champion banner */}
      {champion && memberMap.has(champion) && (
        <Card className="border-accent">
          <CardBody className="flex items-center gap-4">
            <Crown size={32} className="text-accent" />
            <div>
              <p className="text-xs uppercase tracking-wider text-muted">
                Champion
              </p>
              <p className="text-xl font-semibold">
                {memberMap.get(champion)?.name}
              </p>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Members */}
      <section>
        <h2 className="text-sm uppercase tracking-wider text-muted flex items-center gap-2 mb-3">
          <Users size={14} /> Players
        </h2>
        <div className="flex flex-wrap gap-2">
          {Array.from(memberMap.entries()).map(([uid, m]) => (
            <Badge
              key={uid}
              variant={m.eliminated ? "muted" : "default"}
              className={m.eliminated ? "line-through opacity-60" : ""}
            >
              {m.name}
              {uid === userId && (
                <span className="text-accent ml-1">(you)</span>
              )}
            </Badge>
          ))}
        </div>
      </section>

      {/* Bracket */}
      {matches && matches.length > 0 && (
        <section>
          <h2 className="text-sm uppercase tracking-wider text-muted mb-3">
            Bracket
          </h2>
          <Bracket
            matches={matches.map((m) => ({
              id: m.id,
              round: m.round,
              ekadashiDate: m.ekadashi_date,
              status: m.status,
              winnerId: m.winner_id,
              playerA: m.player_a
                ? { id: m.player_a, name: memberMap.get(m.player_a)?.name ?? "?" }
                : null,
              playerB: m.player_b
                ? { id: m.player_b, name: memberMap.get(m.player_b)?.name ?? "?" }
                : null,
            }))}
            currentUserId={userId}
          />
        </section>
      )}

      {league.status === "open" && memberCount < 2 && (
        <p className="text-sm text-muted text-center">
          Need at least 2 players to start.
        </p>
      )}

      {/* Quick links */}
      {matches && matches.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm uppercase tracking-wider text-muted mb-1">
            Schedule
          </h2>
          {Array.from(
            new Set(matches.map((m) => m.ekadashi_date)),
          ).map((date) => (
            <p key={date} className="text-sm">
              <span className="text-muted">
                {formatDate(new Date(date + "T00:00:00"), league.timezone)}:
              </span>{" "}
              Round{" "}
              {matches.find((m) => m.ekadashi_date === date)?.round}
            </p>
          ))}
        </section>
      )}

      <div className="pt-4">
        <Link
          href="/dashboard"
          className="text-sm text-muted hover:text-foreground"
        >
          ← Back to dashboard
        </Link>
      </div>
    </div>
  );
}
