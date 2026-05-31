import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Users, Trophy, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getNextEkadashi } from "@/lib/ekadashi";
import { formatDate } from "@/lib/utils";
import { Card, CardBody, Button, Badge } from "@/components/ui";
import { CountdownToEkadashi } from "@/components/CountdownToEkadashi";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/sign-in");

  const { data: memberships } = await supabase
    .from("league_members")
    .select("league_id")
    .eq("user_id", userData.user.id);

  const leagueIds = memberships?.map((m) => m.league_id) ?? [];

  const { data: leagues } = leagueIds.length
    ? await supabase
        .from("leagues")
        .select("id, name, status, invite_code, current_round")
        .in("id", leagueIds)
    : { data: [] as Array<{
        id: string;
        name: string;
        status: "open" | "active" | "completed";
        invite_code: string;
        current_round: number;
      }> };

  const leagueNameById = new Map((leagues ?? []).map((l) => [l.id, l.name]));

  const { data: matches } = await supabase
    .from("matches")
    .select(
      "id, league_id, round, ekadashi_date, status, player_a, player_b",
    )
    .or(`player_a.eq.${userData.user.id},player_b.eq.${userData.user.id}`)
    .in("status", ["scheduled", "awaiting_submissions", "pending_review"])
    .order("ekadashi_date", { ascending: true });

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, timezone")
    .eq("id", userData.user.id)
    .single();

  const tz = profile?.timezone || "Asia/Kolkata";
  const next = getNextEkadashi(new Date(), tz);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-8">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm text-muted">Welcome back,</p>
          <h1 className="text-3xl font-semibold">
            {profile?.display_name ?? "player"}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link href="/leagues/join">
            <Button variant="secondary">
              <Users size={16} /> Join league
            </Button>
          </Link>
          <Link href="/leagues/new">
            <Button>
              <Plus size={16} /> New league
            </Button>
          </Link>
        </div>
      </header>

      {/* Next Ekadashi countdown */}
      <Card>
        <CardBody className="grid sm:grid-cols-2 gap-6 items-center">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted">
              <Calendar size={14} />
              Next Ekadashi
            </div>
            <h2 className="mt-2 text-2xl font-semibold">
              {formatDate(next.date, tz)}
            </h2>
            <p className="mt-1 text-sm text-muted capitalize">
              {next.paksha} paksha · {tz}
            </p>
          </div>
          <div className="sm:text-right">
            <CountdownToEkadashi target={next.date.toISOString()} />
          </div>
        </CardBody>
      </Card>

      {/* Active matches */}
      {matches && matches.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Your active matches</h2>
          <div className="space-y-2">
            {matches.map((m) => (
              <Link
                key={m.id}
                href={`/matches/${m.id}`}
                className="block rounded-2xl border border-border bg-surface/70 hover:bg-surface transition p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted">
                      {leagueNameById.get(m.league_id) ?? "League"} · Round {m.round}
                    </p>
                    <p className="font-medium">
                      Ekadashi:{" "}
                      <span className="text-accent">
                        {formatDate(new Date(m.ekadashi_date + "T00:00:00"))}
                      </span>
                    </p>
                  </div>
                  <Badge
                    variant={
                      m.status === "pending_review"
                        ? "danger"
                        : m.status === "awaiting_submissions"
                          ? "accent"
                          : "default"
                    }
                  >
                    {m.status.replaceAll("_", " ")}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Leagues list */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Your leagues</h2>
        {!leagues || leagues.length === 0 ? (
          <Card>
            <CardBody className="text-center py-12">
              <Trophy className="mx-auto text-muted" size={32} />
              <p className="mt-3 font-medium">You&apos;re not in any leagues yet.</p>
              <p className="mt-1 text-sm text-muted">
                Create one and invite friends — or join one with a code.
              </p>
              <div className="mt-5 flex gap-2 justify-center">
                <Link href="/leagues/new">
                  <Button>Create your first league</Button>
                </Link>
                <Link href="/leagues/join">
                  <Button variant="secondary">Join with code</Button>
                </Link>
              </div>
            </CardBody>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {leagues.map((lg) => (
              <Link
                key={lg.id}
                href={`/leagues/${lg.id}`}
                className="block rounded-2xl border border-border bg-surface/70 hover:bg-surface p-5 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{lg.name}</h3>
                  <Badge
                    variant={
                      lg.status === "active"
                        ? "accent"
                        : lg.status === "completed"
                          ? "success"
                          : "muted"
                    }
                  >
                    {lg.status}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted">
                  {lg.status === "open"
                    ? `Code: ${lg.invite_code}`
                    : `Round ${lg.current_round}`}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
