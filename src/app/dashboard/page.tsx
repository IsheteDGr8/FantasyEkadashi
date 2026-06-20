import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Users, Trophy, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { getNextEkadashi } from "@/lib/ekadashi";
import { formatDate } from "@/lib/utils";
import { Card, CardBody, Button, Badge } from "@/components/ui";
import { CountdownToEkadashi } from "@/components/CountdownToEkadashi";
import { SetupRequiredScreen, supabaseConfigured } from "@/components/SetupRequired";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  if (!supabaseConfigured()) return <SetupRequiredScreen />;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/sign-in");

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", profile.id);
  const groupIds = memberships?.map((m) => m.group_id) ?? [];

  const { data: groups } = groupIds.length
    ? await admin
        .from("groups")
        .select("id, name, status, join_code, current_round")
        .in("id", groupIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const { data: matches } = await supabase
    .from("matches")
    .select("id, group_id, round, ekadashi_date, status, player_a, player_b")
    .or(`player_a.eq.${profile.id},player_b.eq.${profile.id}`)
    .in("status", ["scheduled", "awaiting_submissions", "pending_review"])
    .order("ekadashi_date", { ascending: true });

  const groupNameById = new Map((groups ?? []).map((g) => [g.id, g.name]));
  const tz = "Asia/Kolkata";
  const next = getNextEkadashi(new Date(), tz);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-8">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm text-muted">Welcome back,</p>
          <h1 className="text-3xl font-semibold">{profile.display_name}</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/groups/join">
            <Button variant="secondary"><Users size={16} /> Join group</Button>
          </Link>
          {profile.is_admin && (
            <Link href="/groups/new">
              <Button><Plus size={16} /> New group</Button>
            </Link>
          )}
        </div>
      </header>

      <Card>
        <CardBody className="grid sm:grid-cols-2 gap-6 items-center">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted">
              <Calendar size={14} /> Next Ekadashi
            </div>
            <h2 className="mt-2 text-2xl font-semibold">{formatDate(next.date, tz)}</h2>
            <p className="mt-1 text-sm text-muted capitalize">{next.paksha} paksha · {tz}</p>
          </div>
          <div className="sm:text-right">
            <CountdownToEkadashi target={next.date.toISOString()} />
          </div>
        </CardBody>
      </Card>

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
                      {groupNameById.get(m.group_id) ?? "Group"} · Round {m.round}
                    </p>
                    <p className="font-medium">
                      Ekadashi:{" "}
                      <span className="text-accent">
                        {formatDate(new Date(m.ekadashi_date + "T00:00:00"), tz)}
                      </span>
                    </p>
                  </div>
                  <Badge
                    variant={
                      m.status === "pending_review" ? "danger"
                      : m.status === "awaiting_submissions" ? "accent"
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

      <section>
        <h2 className="text-lg font-semibold mb-3">Your groups</h2>
        {!groups || groups.length === 0 ? (
          <Card>
            <CardBody className="text-center py-12">
              <Trophy className="mx-auto text-muted" size={32} />
              <p className="mt-3 font-medium">You&apos;re not in any groups yet.</p>
              <p className="mt-1 text-sm text-muted">
                {profile.is_admin
                  ? "Create one and share the code, or join with a code."
                  : "Ask your admin for a join code."}
              </p>
              <div className="mt-5 flex gap-2 justify-center">
                {profile.is_admin && (
                  <Link href="/groups/new"><Button>Create a group</Button></Link>
                )}
                <Link href="/groups/join"><Button variant="secondary">Join with code</Button></Link>
              </div>
            </CardBody>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {groups.map((g) => (
              <Link
                key={g.id}
                href={`/groups/${g.id}`}
                className="block rounded-2xl border border-border bg-surface/70 hover:bg-surface p-5 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{g.name}</h3>
                  <Badge
                    variant={
                      g.status === "active" ? "accent"
                      : g.status === "completed" ? "success"
                      : "muted"
                    }
                  >
                    {g.status}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted">
                  {g.status === "open" ? `Code: ${g.join_code}` : `Round ${g.current_round}`}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
