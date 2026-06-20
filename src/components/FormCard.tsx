"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Result = { error: string } | { ok: true } | void;

/**
 * Wraps a form whose submit calls a server action returning { error } | { ok }.
 * On success it refreshes; redirects from the action work transparently.
 */
export function ActionForm({
  action,
  children,
  className,
  redirectTo,
}: {
  action: (formData: FormData) => Promise<Result>;
  children: React.ReactNode;
  className?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await action(fd);
      if (result && "error" in result) {
        setError(result.error);
        return;
      }
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className={className}>
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      {error && (
        <p className="mt-3 text-sm text-danger rounded-lg bg-danger/10 border border-danger/30 p-3">
          {error}
        </p>
      )}
    </form>
  );
}
