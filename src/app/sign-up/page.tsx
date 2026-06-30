import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthForm } from "@/components/AuthForm";
import { Card, CardBody } from "@/components/ui";
import { MoonPhase } from "@/components/MoonPhase";
import { SetupRequiredScreen, supabaseConfigured } from "@/components/SetupRequired";

export const metadata = { title: "Create account" };

function safeNext(next?: string): string | undefined {
  return next && next.startsWith("/") ? next : undefined;
}

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (!supabaseConfigured()) return <SetupRequiredScreen />;
  const { next } = await searchParams;
  const dest = safeNext(next);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect(dest ?? "/dashboard");

  const signInHref = dest ? `/sign-in?next=${encodeURIComponent(dest)}` : "/sign-in";

  return (
    <div className="mx-auto max-w-md px-4 sm:px-6 pt-12 sm:pt-16">
      <div className="mb-6 flex justify-center fe-float">
        <MoonPhase pos={0.18} size={68} glow />
      </div>
      <Card>
        <CardBody className="space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-semibold tracking-tight">
              Join the <span className="fe-gradient-text">constellation</span>
            </h1>
            <p className="mt-1.5 text-sm text-muted">
              Your name is shown to other players. Your email is private — it&apos;s
              only your login, and we&apos;ll send a confirmation link to verify it.
            </p>
          </div>
          <AuthForm mode="sign-up" next={dest} />
          <p className="text-sm text-muted text-center">
            Already have an account?{" "}
            <Link href={signInHref} className="text-accent hover:underline">
              Sign in
            </Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
