import Link from "next/link";
import { Moon, LayoutDashboard, Sparkles, User } from "lucide-react";
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
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-3 py-2.5 sm:px-6 sm:py-3">
        <Link href="/" className="group flex min-w-0 items-center gap-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent to-accent-2 text-accent-foreground shadow-md shadow-accent/20 transition group-hover:scale-105">
            <Moon size={18} strokeWidth={2.5} />
          </span>
          <span className="truncate font-semibold tracking-tight">
            Fantasy <span className="text-accent">Ekadashi</span>
          </span>
        </Link>

        <nav className="flex shrink-0 items-center gap-0.5 text-sm sm:gap-1">
          {signedIn ? (
            <>
              <NavLink href="/dashboard" label="Dashboard">
                <LayoutDashboard size={16} />
              </NavLink>
              <NavLink href="/learn" label="Learn">
                <Sparkles size={16} />
              </NavLink>
              <NavLink href="/profile" label={name ?? "Profile"} truncate>
                <User size={16} />
              </NavLink>
              <SignOutButton />
            </>
          ) : (
            <>
              <NavLink href="/learn" label="Learn">
                <Sparkles size={16} />
              </NavLink>
              <Link
                href="/sign-in"
                className="ml-1 inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-accent px-4 py-1.5 font-medium text-accent-foreground transition hover:opacity-90"
              >
                Sign in
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function NavLink({
  href,
  label,
  children,
  truncate,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
  truncate?: boolean;
}) {
  return (
    <Link
      href={href}
      title={label}
      className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-foreground/80 transition hover:bg-surface hover:text-foreground"
    >
      {children}
      <span className={truncate ? "hidden max-w-[7rem] truncate sm:inline" : "hidden sm:inline"}>
        {label}
      </span>
    </Link>
  );
}
