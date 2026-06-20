"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { adminResolveMatch } from "@/server/actions/matches";

export function AdminResolveForm({
  matchId,
  playerA,
  playerB,
}: {
  matchId: string;
  playerA: { id: string; name: string };
  playerB: { id: string; name: string };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function pick(winnerId: string) {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("matchId", matchId);
      fd.set("winnerId", winnerId);
      const result = await adminResolveMatch(fd);
      if (result && "error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => pick(playerA.id)} disabled={pending}>{playerA.name} wins</Button>
        <Button onClick={() => pick(playerB.id)} disabled={pending}>{playerB.name} wins</Button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
