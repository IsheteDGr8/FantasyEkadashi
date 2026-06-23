"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@/components/ui";
import { updateProfile } from "@/server/actions/profile";

export function ProfileForm({
  initialName,
  initialPhone,
}: {
  initialName: string;
  initialPhone: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateProfile(fd);
      if (result && "error" in result) {
        setError(result.error);
        return;
      }
      setSuccess(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="displayName">Display name</Label>
        <Input
          id="displayName"
          name="displayName"
          required
          minLength={2}
          maxLength={40}
          defaultValue={initialName}
          autoComplete="name"
        />
        <p className="text-xs text-muted">Shown publicly on leaderboards.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone number</Label>
        <Input
          id="phone"
          name="phone"
          required
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          defaultValue={initialPhone}
        />
        <p className="text-xs text-muted">
          Private — this is your login. If you change it, sign in with the new
          number next time (your password stays the same).
        </p>
      </div>
      {error && (
        <p className="text-sm text-danger rounded-lg bg-danger/10 border border-danger/30 p-3">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-success rounded-lg bg-success/10 border border-success/30 p-3">
          Profile updated.
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
