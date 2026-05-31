"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { creatorResolveDispute } from "@/server/actions/matches";

interface Props {
  matchId: string;
  playerA: { id: string; name: string };
  playerB: { id: string; name: string };
}

export function CreatorResolveForm({ matchId, playerA, playerB }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function pick(winnerId: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("matchId", matchId);
      fd.set("winnerId", winnerId);
      await creatorResolveDispute(fd);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => pick(playerA.id)} disabled={pending}>
        {playerA.name} wins
      </Button>
      <Button onClick={() => pick(playerB.id)} disabled={pending}>
        {playerB.name} wins
      </Button>
    </div>
  );
}
