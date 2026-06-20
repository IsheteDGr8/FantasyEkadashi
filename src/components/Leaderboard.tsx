import { cn } from "@/lib/utils";
import { formatMinutes } from "@/lib/utils";
import { Badge } from "@/components/ui";

export interface LeaderboardRow {
  userId: string;
  name: string;
  totalMin: number | null; // null = not submitted
  lost: boolean;
  isMe: boolean;
  breakdown?: { social: number; games: number; entertainment: number; creativity: number; whatsapp: number };
}

/**
 * Ranks rows by lowest total screen time (submitted first), non-submitters
 * last. Losers are marked. Used for both per-Ekadashi and all-time views.
 */
export function Leaderboard({ rows, showBreakdown = false }: { rows: LeaderboardRow[]; showBreakdown?: boolean }) {
  const sorted = [...rows].sort((a, b) => {
    if (a.totalMin === null && b.totalMin === null) return a.name.localeCompare(b.name);
    if (a.totalMin === null) return 1;
    if (b.totalMin === null) return -1;
    return a.totalMin - b.totalMin;
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface-2 text-muted">
          <tr>
            <th className="text-left font-medium px-3 py-2 w-10">#</th>
            <th className="text-left font-medium px-3 py-2">Player</th>
            {showBreakdown && (
              <th className="text-right font-medium px-3 py-2 hidden sm:table-cell">
                S / G / E / C
              </th>
            )}
            <th className="text-right font-medium px-3 py-2">Total</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => {
            const rank = row.totalMin === null ? null : i + 1;
            return (
              <tr
                key={row.userId}
                className={cn(
                  "border-t border-border/60",
                  row.isMe && "bg-accent/5",
                  rank === 1 && "bg-success/5",
                )}
              >
                <td className="px-3 py-2 text-muted">{rank ?? "—"}</td>
                <td className="px-3 py-2">
                  <span className="font-medium">{row.name}</span>
                  {row.isMe && <span className="text-accent ml-1.5 text-xs">(you)</span>}
                  {row.lost && (
                    <Badge variant="danger" className="ml-2 align-middle">lost</Badge>
                  )}
                  {rank === 1 && !row.lost && (
                    <Badge variant="success" className="ml-2 align-middle">lowest</Badge>
                  )}
                </td>
                {showBreakdown && (
                  <td className="px-3 py-2 text-right text-muted font-mono text-xs hidden sm:table-cell">
                    {row.breakdown
                      ? `${row.breakdown.social}/${row.breakdown.games}/${row.breakdown.entertainment}/${row.breakdown.creativity}`
                      : "—"}
                  </td>
                )}
                <td className="px-3 py-2 text-right font-mono tabular-nums">
                  {row.totalMin === null ? (
                    <span className="text-muted italic">no submission</span>
                  ) : (
                    formatMinutes(row.totalMin)
                  )}
                </td>
              </tr>
            );
          })}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={showBreakdown ? 4 : 3} className="px-3 py-6 text-center text-muted">
                No players yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
