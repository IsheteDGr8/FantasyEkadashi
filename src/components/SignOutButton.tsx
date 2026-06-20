"use client";

import { useFormStatus } from "react-dom";
import { signOutAction } from "@/server/actions/auth";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-3 py-1.5 rounded-full text-foreground/70 hover:text-foreground hover:bg-surface transition disabled:opacity-50"
    >
      {pending ? "…" : "Sign out"}
    </button>
  );
}

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <SubmitButton />
    </form>
  );
}
