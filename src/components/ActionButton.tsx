"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, type ButtonProps } from "@/components/ui";

type Result = { error: string } | { ok: true } | void;

interface Props extends Omit<ButtonProps, "onClick"> {
  action: () => Promise<Result>;
  confirm?: string;
  children: React.ReactNode;
}

/** Button that runs a server action, surfaces errors, and refreshes. */
export function ActionButton({ action, confirm, children, ...rest }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run() {
    if (confirm && !window.confirm(confirm)) return;
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result && "error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <Button {...rest} onClick={run} disabled={pending || rest.disabled}>
        {pending ? "…" : children}
      </Button>
      {error && <span className="text-xs text-danger max-w-[16rem]">{error}</span>}
    </span>
  );
}
