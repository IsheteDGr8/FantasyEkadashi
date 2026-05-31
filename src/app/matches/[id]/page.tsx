import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Crown, AlertTriangle, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, Badge } from "@/components/ui";
import { ScreenTimeSubmit } from "@/components/ScreenTimeSubmit";
import { DisputeForm } from "@/components/DisputeForm";
import { CreatorResolveForm } from "@/components/CreatorResolveForm";
import { formatDate, formatMinutes } from "@/lib/utils";
import { getSubmissionWindow } from "@/lib/ekadashi";

export const metadata = { title: "Match" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MatchPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/sign-in");
  const userId = userData.user.id;

  const { data: match, error } = await supabase
    .from("matches")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !match) notFound();

  const { data: league } = await supabase
    .from("leagues")
    .select("id, name, timezone, created_by")
    .eq("id", match.league_id)
    .single();
  if (!league) notFound();

  const playerIds = [match.player_a, match.player_b].filter(Boolean) as string[];
  const { data: players } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", playerIds);
  const nameOf = (uid: string | null) =>
    uid ? players?.find((p) => p.id === uid)?.display_name ?? "Player" : "—";

  const { data: subs } = await supabase
    .from("submissions")
    .select("*")
    .eq("match_id", match.id);

  const mySub = subs?.find((s) => s.player_id === userId) ?? null;
  const opponentId =
    match.player_a === userId
      ? match.player_b
      : match.player_b === userId
        ? match.player_a
        : null;
  const opponentSub = opponentId
    ? subs?.find((s) => s.player_id === opponentId) ?? null
    : null;

  const userIsPlayer = match.player_a === userId || match.player_b === userId;
  const isCreator = league.created_by === userId;
  const isBye = !match.player_b;

  const window = getSubmissionWindow(
    new Date(match.ekadashi_date + "T00:00:00"),
    league.timezone,
  );
  const now = new Date();
  const submissionOpen = now >= window.opensAt && now <= window.closesAt;
  const submissionClosed = now > window.closesAt;

  function screenshotUrl(path: string | null): string | null {
    if (!path) return null;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url) return null;
    return `${url}/storage/v1/object/public/screenshots/${path}`;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6">
      <div>
        <Link
          href={`/leagues/${league.id}`}
          className="text-sm text-muted hover:text-foreground"
        >
          ← {league.name}
        </Link>
        <div className="mt-2 flex items-end justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-semibold">
              Round {match.round} match
            </h1>
            <p className="mt-1 text-sm text-muted">
              Ekadashi:{" "}
              <span className="text-foreground">
                {formatDate(
                  new Date(match.ekadashi_date + "T00:00:00"),
                  league.timezone,
                )}
              </span>
            </p>
          </div>
          <Badge
            variant={
              match.status === "completed"
                ? "success"
                : match.status === "pending_review"
                  ? "danger"
                  : "accent"
            }
          >
            {match.status.replaceAll("_", " ")}
          </Badge>
        </div>
      </div>

      {/* Winner banner */}
      {match.winner_id && (
        <Card className="border-accent">
          <CardBody className="flex items-center gap-3">
            <Crown size={24} className="text-accent" />
            <div>
              <p className="text-xs uppercase tracking-wider text-muted">
                Winner
              </p>
              <p className="text-lg font-semibold">{nameOf(match.winner_id)}</p>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Bye message */}
      {isBye && !match.winner_id && (
        <Card>
          <CardBody>
            <p className="text-sm">
              {nameOf(match.player_a)} has a bye this round — no match needed.
            </p>
          </CardBody>
        </Card>
      )}

      {/* Submission window status */}
      {!isBye && (
        <Card>
          <CardBody className="flex items-center gap-3 text-sm">
            <Clock size={16} className="text-muted" />
            {submissionOpen ? (
              <span>
                Submissions are <span className="text-success">open</span> until{" "}
                {window.closesAt.toLocaleString("en-US", {
                  timeZone: league.timezone,
                })}{" "}
                ({league.timezone}).
              </span>
            ) : submissionClosed ? (
              <span className="text-muted">
                Submission window has closed.
              </span>
            ) : (
              <span className="text-muted">
                Submissions open at{" "}
                {window.opensAt.toLocaleString("en-US", {
                  timeZone: league.timezone,
                })}{" "}
                ({league.timezone}).
              </span>
            )}
          </CardBody>
        </Card>
      )}

      {/* Players */}
      {!isBye && (
        <div className="grid sm:grid-cols-2 gap-4">
          <PlayerCard
            name={nameOf(match.player_a)}
            isMe={match.player_a === userId}
            sub={subs?.find((s) => s.player_id === match.player_a) ?? null}
            screenshotUrl={screenshotUrl(
              subs?.find((s) => s.player_id === match.player_a)
                ?.screenshot_path ?? null,
            )}
            isWinner={match.winner_id === match.player_a}
          />
          <PlayerCard
            name={nameOf(match.player_b)}
            isMe={match.player_b === userId}
            sub={subs?.find((s) => s.player_id === match.player_b) ?? null}
            screenshotUrl={screenshotUrl(
              subs?.find((s) => s.player_id === match.player_b)
                ?.screenshot_path ?? null,
            )}
            isWinner={match.winner_id === match.player_b}
          />
        </div>
      )}

      {/* Submission form */}
      {userIsPlayer && !isBye && submissionOpen && match.status !== "completed" && (
        <Card>
          <CardBody className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">
                {mySub ? "Update your submission" : "Submit your screen time"}
              </h2>
              <p className="text-sm text-muted mt-1">
                Upload an iOS Screen Time or Android Digital Wellbeing
                screenshot — we&apos;ll read the daily total. Or just type it in.
              </p>
            </div>
            <ScreenTimeSubmit matchId={match.id} existing={mySub} />
          </CardBody>
        </Card>
      )}

      {/* Dispute */}
      {userIsPlayer &&
        !isBye &&
        opponentSub &&
        match.status !== "completed" &&
        !opponentSub.disputed && (
          <Card>
            <CardBody className="space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-danger mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold">Dispute opponent&apos;s submission</h3>
                  <p className="text-sm text-muted mt-0.5">
                    If the screenshot looks fake, cropped, or the number
                    doesn&apos;t match, you can dispute. The league creator will
                    review.
                  </p>
                </div>
              </div>
              <DisputeForm matchId={match.id} />
            </CardBody>
          </Card>
        )}

      {/* Creator dispute resolution */}
      {isCreator &&
        match.status === "pending_review" &&
        match.player_a &&
        match.player_b && (
          <Card className="border-danger/40">
            <CardBody className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <AlertTriangle size={18} className="text-danger" />
                Resolve dispute
              </h3>
              <p className="text-sm text-muted">
                As league creator, pick a winner.
              </p>
              <CreatorResolveForm
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
  name,
  isMe,
  sub,
  screenshotUrl,
  isWinner,
}: {
  name: string;
  isMe: boolean;
  sub: {
    screen_time_minutes: number;
    screenshot_path: string | null;
    source: string;
    disputed: boolean;
  } | null;
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
            <p className="text-2xl font-semibold font-mono tabular-nums">
              {formatMinutes(sub.screen_time_minutes)}
            </p>
            <p className="text-xs text-muted">
              {sub.source === "ocr"
                ? "Auto-read from screenshot"
                : sub.source === "manual"
                  ? "Manually entered"
                  : "OCR + manual"}
              {sub.disputed && (
                <span className="text-danger ml-2">· disputed</span>
              )}
            </p>
            {screenshotUrl && (
              <a
                href={screenshotUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block mt-2"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={screenshotUrl}
                  alt="Screen time screenshot"
                  className="max-h-48 w-auto rounded-lg border border-border"
                />
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
