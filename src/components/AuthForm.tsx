"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MailCheck } from "lucide-react";
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
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isSignUp = mode === "sign-up";

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") ?? "");
    startTransition(async () => {
      const result = isSignUp ? await signUp(formData) : await signIn(formData);
      if (result && "error" in result) {
        setError(result.error);
        return;
      }
      if (result && "needsConfirmation" in result && result.needsConfirmation) {
        setSentTo(email);
        return;
      }
      const dest = next && next.startsWith("/") ? next : "/dashboard";
      router.refresh();
      router.push(dest);
    });
  }

  if (sentTo) {
    return (
      <div className="space-y-3 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
          <MailCheck size={22} />
        </div>
        <h2 className="text-lg font-semibold">Confirm your email</h2>
        <p className="text-sm text-muted">
          We sent a confirmation link to{" "}
          <span className="text-foreground">{sentTo}</span>. Click it to activate
          your account, then come back and sign in.
        </p>
        <p className="text-xs text-muted">
          Didn&apos;t get it? Check spam, or wait a minute and try again.
        </p>
      </div>
    );
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
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          required
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
        />
        {isSignUp && <p className="text-xs text-muted">Private. We&apos;ll send a confirmation link here.</p>}
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
