import Link from "next/link";
import { cn, formatDate } from "@/lib/utils";
import type { MatchStatus } from "@/lib/supabase/types";

export interface MatchView {
  id: string;
  round: number;
  ekadashiDate: string;
  status: MatchStatus;
  winnerId: string | null;
  playerA: { id: string; name: string } | null;
  playerB: { id: string; name: string } | null;
}

export function Bracket({
  matches,
  currentUserId,
  timeZone = "Asia/Kolkata",
}: {
  matches: MatchView[];
  currentUserId: string;
  timeZone?: string;
}) {
  // One column per Ekadashi, most recent on the right.
  const rounds = Array.from(new Set(matches.map((m) => m.round))).sort((a, b) => a - b);

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
      <div className="flex gap-4 min-w-max">
        {rounds.map((r) => {
          const roundMatches = matches.filter((m) => m.round === r);
          const ekDate = roundMatches[0]?.ekadashiDate;
          return (
            <div key={r} className="flex flex-col gap-3 min-w-[220px]">
              <h3 className="text-xs uppercase tracking-wider text-muted px-1">
                {ekDate ? formatDate(new Date(ekDate + "T00:00:00"), timeZone) : `Round ${r}`}
              </h3>
              <div className="flex flex-col gap-3">
                {roundMatches.map((m) => (
                  <MatchCard key={m.id} match={m} currentUserId={currentUserId} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MatchCard({ match, currentUserId }: { match: MatchView; currentUserId: string }) {
  const involvesUser =
    match.playerA?.id === currentUserId || match.playerB?.id === currentUserId;
  return (
    <Link href={`/matches/${match.id}`} className="block">
      <div
        className={cn(
          "rounded-xl border bg-surface/70 p-2.5 text-sm w-full transition hover:bg-surface",
          involvesUser ? "border-accent/50 ring-1 ring-accent/30" : "border-border",
        )}
      >
        <PlayerRow
          name={match.playerA?.name ?? "—"}
          isWinner={match.winnerId === match.playerA?.id}
          isMe={match.playerA?.id === currentUserId}
          ghost={!match.playerA}
        />
        <div className="my-1 h-px bg-border/60" />
        <PlayerRow
          name={match.playerB?.name ?? (match.playerA && !match.playerB ? "BYE" : "—")}
          isWinner={match.winnerId === match.playerB?.id}
          isMe={match.playerB?.id === currentUserId}
          ghost={!match.playerB}
        />
        <p className="mt-1.5 text-[10px] uppercase tracking-wider text-muted text-center">
          {match.status === "completed" ? "decided"
            : match.status === "pending_review" ? "disputed"
            : match.status.replaceAll("_", " ")}
        </p>
      </div>
    </Link>
  );
}

function PlayerRow({
  name, isWinner, isMe, ghost,
}: { name: string; isWinner: boolean; isMe: boolean; ghost?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between px-1 py-1 rounded", isWinner && "bg-success/10", ghost && "text-muted italic")}>
      <span className={cn("truncate", isWinner && "font-semibold text-success")}>
        {name}
        {isMe && <span className="text-accent ml-1">(you)</span>}
      </span>
      {isWinner && <span className="text-[10px] uppercase tracking-wider text-success">win</span>}
    </div>
  );
}
