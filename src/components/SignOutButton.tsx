"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function signOut() {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.refresh();
      router.push("/");
    });
  }

  return (
    <button
      onClick={signOut}
      disabled={pending}
      className="px-3 py-1.5 rounded-full text-foreground/70 hover:text-foreground hover:bg-surface transition disabled:opacity-50"
    >
      {pending ? "…" : "Sign out"}
    </button>
  );
}
