import Link from "next/link";
import { Moon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./SignOutButton";

export async function Nav() {
  let signedIn = false;
  let name: string | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    signedIn = !!data.user;
    name = (data.user?.user_metadata?.display_name as string) ?? null;
  } catch {
    // env not set yet
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-accent to-accent-2 text-accent-foreground shadow-md shadow-accent/20 transition group-hover:scale-105">
            <Moon size={18} strokeWidth={2.5} />
          </span>
          <span className="font-semibold tracking-tight">
            Fantasy <span className="text-accent">Ekadashi</span>
          </span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4 text-sm">
          {signedIn ? (
            <>
              <Link href="/dashboard" className="px-3 py-1.5 rounded-full text-foreground/80 hover:text-foreground hover:bg-surface transition">
                Dashboard
              </Link>
              {name && <span className="hidden sm:inline text-muted text-xs">{name}</span>}
              <SignOutButton />
            </>
          ) : (
            <Link href="/sign-in" className="px-4 py-1.5 rounded-full bg-accent text-accent-foreground font-medium hover:opacity-90 transition">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
