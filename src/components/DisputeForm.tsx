"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Label } from "@/components/ui";
import { disputeOpponentSubmission } from "@/server/actions/matches";

export function DisputeForm({ matchId }: { matchId: string }) {
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("matchId", matchId);
        if (note) fd.set("note", note);
        await disputeOpponentSubmission(fd);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Dispute failed.");
      }
    });
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="dispute-note">Reason (optional)</Label>
      <textarea
        id="dispute-note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={500}
        placeholder="e.g. The screenshot shows weekly average, not today."
        className="w-full min-h-[80px] rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/60"
      />
      {error && (
        <p className="text-sm text-danger rounded-lg bg-danger/10 border border-danger/30 p-3">
          {error}
        </p>
      )}
      <Button
        type="button"
        variant="danger"
        size="sm"
        onClick={submit}
        disabled={pending}
      >
        {pending ? "Filing…" : "Dispute"}
      </Button>
    </div>
  );
}
