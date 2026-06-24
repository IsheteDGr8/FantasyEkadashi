import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Crown, AlertTriangle, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth";
import { Card, CardBody, Badge } from "@/components/ui";
import { ScreenTimeSubmit } from "@/components/ScreenTimeSubmit";
import { DisputeForm } from "@/components/DisputeForm";
import { AdminResolveForm } from "@/components/AdminResolveForm";
import { formatDateStr, formatMinutes } from "@/lib/utils";
import { getSubmissionWindow, ekadashiDateToInstant } from "@/lib/ekadashi";
import { SetupRequiredScreen, supabaseConfigured } from "@/components/SetupRequired";
import type { Submission } from "@/lib/supabase/types";

export const metadata = { title: "Match" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MatchPage({ params }: PageProps) {
  if (!supabaseConfigured()) return <SetupRequiredScreen />;
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/sign-in");
  const userId = profile.id;

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: match, error } = await supabase.from("matches").select("*").eq("id", id).single();
  if (error || !match) notFound();

  const playerIds = [match.player_a, match.player_b].filter(Boolean) as string[];
  const [{ data: group }, { data: players }, { data: subs }] = await Promise.all([
    supabase
      .from("groups")
      .select("id, name, timezone, admin_id")
      .eq("id", match.group_id)
      .single(),
    playerIds.length
      ? admin.from("profiles").select("id, display_name").in("id", playerIds)
      : Promise.resolve({ data: [] as { id: string; display_name: string }[] }),
    supabase.from("submissions").select("*").eq("match_id", match.id),
  ]);
  if (!group) notFound();

  const nameOf = (uid: string | null) =>
    uid ? players?.find((p) => p.id === uid)?.display_name ?? "Player" : "—";
  const subOf = (uid: string | null): Submission | null =>
    uid ? subs?.find((s) => s.player_id === uid) ?? null : null;

  const mySub = subOf(userId);
  const opponentId =
    match.player_a === userId ? match.player_b : match.player_b === userId ? match.player_a : null;
  const opponentSub = subOf(opponentId);

  const userIsPlayer = match.player_a === userId || match.player_b === userId;
  const isAdmin = group.admin_id === userId;
  const isBye = !match.player_b;

  const win = getSubmissionWindow(
    ekadashiDateToInstant(match.ekadashi_date, group.timezone),
    group.timezone,
  );
  const now = new Date();
  const submissionOpen = now >= win.opensAt && now <= win.closesAt;
  const submissionClosed = now > win.closesAt;

  function screenshotUrl(path: string | null): string | null {
    if (!path) return null;
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return base ? `${base}/storage/v1/object/public/screenshots/${path}` : null;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6">
      <div>
        <Link href={`/groups/${group.id}`} className="text-sm text-muted hover:text-foreground">
          ← {group.name}
        </Link>
        <div className="mt-2 flex items-end justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-semibold">Round {match.round} match</h1>
            <p className="mt-1 text-sm text-muted">
              Ekadashi:{" "}
              <span className="text-foreground">
                {formatDateStr(match.ekadashi_date)}
              </span>
            </p>
          </div>
          <Badge
            variant={
              match.status === "completed" ? "success"
              : match.status === "pending_review" ? "danger"
              : "accent"
            }
          >
            {match.status.replaceAll("_", " ")}
          </Badge>
        </div>
      </div>

      {match.winner_id && (
        <Card className="border-accent">
          <CardBody className="flex items-center gap-3">
            <Crown size={24} className="text-accent" />
            <div>
              <p className="text-xs uppercase tracking-wider text-muted">Winner</p>
              <p className="text-lg font-semibold">{nameOf(match.winner_id)}</p>
            </div>
          </CardBody>
        </Card>
      )}

      {isBye && !match.winner_id && (
        <Card>
          <CardBody>
            <p className="text-sm">{nameOf(match.player_a)} has a bye this round — no match needed.</p>
          </CardBody>
        </Card>
      )}

      {!isBye && (
        <Card>
          <CardBody className="flex items-center gap-3 text-sm">
            <Clock size={16} className="text-muted" />
            {submissionOpen ? (
              <span>
                Submissions <span className="text-success">open</span> until{" "}
                {win.closesAt.toLocaleString("en-US", { timeZone: group.timezone, dateStyle: "medium", timeStyle: "short" })} ({group.timezone}).
              </span>
            ) : submissionClosed ? (
              <span className="text-muted">Submission window has closed.</span>
            ) : (
              <span className="text-muted">
                Submissions open the day after the Ekadashi —{" "}
                {win.opensAt.toLocaleString("en-US", { timeZone: group.timezone, dateStyle: "medium", timeStyle: "short" })} ({group.timezone}).
              </span>
            )}
          </CardBody>
        </Card>
      )}

      {!isBye && (
        <div className="grid sm:grid-cols-2 gap-4">
          <PlayerCard
            name={nameOf(match.player_a)}
            isMe={match.player_a === userId}
            sub={subOf(match.player_a)}
            screenshotUrl={screenshotUrl(subOf(match.player_a)?.screenshot_path ?? null)}
            isWinner={match.winner_id === match.player_a}
          />
          <PlayerCard
            name={nameOf(match.player_b)}
            isMe={match.player_b === userId}
            sub={subOf(match.player_b)}
            screenshotUrl={screenshotUrl(subOf(match.player_b)?.screenshot_path ?? null)}
            isWinner={match.winner_id === match.player_b}
          />
        </div>
      )}

      {userIsPlayer && !isBye && submissionOpen && match.status !== "completed" && (
        <Card>
          <CardBody className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">
                {mySub ? "Update your submission" : "Submit your screen time"}
              </h2>
              <p className="text-sm text-muted mt-1">
                On iOS: Settings → Screen Time → See All Activity → tap the{" "}
                <span className="text-foreground">Ekadashi day</span> →
                &ldquo;Show Categories&rdquo;. Screenshot it and upload (or paste
                it); we read Social, Games, Entertainment, and Creativity.
              </p>
            </div>
            <ScreenTimeSubmit matchId={match.id} existing={mySub} />
          </CardBody>
        </Card>
      )}

      {userIsPlayer && !isBye && opponentSub && match.status !== "completed" && !opponentSub.disputed && (
        <Card>
          <CardBody className="space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-danger mt-0.5" />
              <div>
                <h3 className="font-semibold">Something off with their numbers?</h3>
                <p className="text-sm text-muted mt-0.5">
                  Dispute it and the group admin will review the screenshots.
                </p>
              </div>
            </div>
            <DisputeForm matchId={match.id} />
          </CardBody>
        </Card>
      )}

      {isAdmin && match.status === "pending_review" && match.player_a && match.player_b && (
        <Card className="border-danger/40">
          <CardBody className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <AlertTriangle size={18} className="text-danger" /> Resolve match (admin)
            </h3>
            <p className="text-sm text-muted">Pick the winner after reviewing both screenshots.</p>
            <AdminResolveForm
              matchId={match.id}
              playerA={{ id: match.player_a, name: nameOf(match.player_a) }}
              playerB={{ id: match.player_b, name: nameOf(match.player_b) }}
            />
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function PlayerCard({
  name, isMe, sub, screenshotUrl, isWinner,
}: {
  name: string;
  isMe: boolean;
  sub: Submission | null;
  screenshotUrl: string | null;
  isWinner: boolean;
}) {
  return (
    <Card className={isWinner ? "border-success" : ""}>
      <CardBody className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-semibold">
            {name}
            {isMe && <span className="text-accent ml-1.5 text-sm">(you)</span>}
          </p>
          {isWinner && <Badge variant="success">winner</Badge>}
        </div>
        {sub ? (
          <div className="space-y-2">
            <p className="text-2xl font-semibold font-mono tabular-nums">{formatMinutes(sub.total_min)}</p>
            <ul className="text-xs text-muted space-y-0.5">
              <li>Social: {formatMinutes(Math.max(0, sub.social_min - sub.whatsapp_min))} {sub.whatsapp_min > 0 && <span>(−{formatMinutes(sub.whatsapp_min)} WhatsApp)</span>}</li>
              <li>Games: {formatMinutes(sub.games_min)}</li>
              <li>Entertainment: {formatMinutes(sub.entertainment_min)}</li>
              <li>Creativity: {formatMinutes(sub.creativity_min)}</li>
            </ul>
            {sub.disputed && <Badge variant="danger">disputed</Badge>}
            {screenshotUrl && (
              <a href={screenshotUrl} target="_blank" rel="noopener noreferrer" className="block mt-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={screenshotUrl} alt="Screenshot" className="max-h-48 w-auto rounded-lg border border-border" />
              </a>
            )}
          </div>
        ) : (
          <p className="text-muted text-sm italic">Not submitted yet.</p>
        )}
      </CardBody>
    </Card>
  );
}
