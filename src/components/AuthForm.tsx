"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@/components/ui";
import { signIn, signUp } from "@/server/actions/auth";

export function AuthForm({
  mode,
  next,
}: {
  mode: "sign-in" | "sign-up";
  next?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isSignUp = mode === "sign-up";

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = isSignUp ? await signUp(formData) : await signIn(formData);
      if (result && "error" in result) {
        setError(result.error);
        return;
      }
      const dest = next && next.startsWith("/") ? next : "/dashboard";
      router.refresh();
      router.push(dest);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {isSignUp && (
        <div className="space-y-1.5">
          <Label htmlFor="displayName">Display name</Label>
          <Input id="displayName" name="displayName" required placeholder="e.g. Arjuna" autoComplete="name" />
          <p className="text-xs text-muted">Shown publicly on leaderboards.</p>
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone number</Label>
        <Input
          id="phone"
          name="phone"
          required
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+1 555 123 4567"
        />
        {isSignUp && <p className="text-xs text-muted">Private. Used only to log you in.</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          required
          type="password"
          minLength={6}
          autoComplete={isSignUp ? "new-password" : "current-password"}
          placeholder={isSignUp ? "At least 6 characters" : "Your password"}
        />
      </div>
      {error && (
        <p className="text-sm text-danger rounded-lg bg-danger/10 border border-danger/30 p-3">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
      </Button>
    </form>
  );
}
