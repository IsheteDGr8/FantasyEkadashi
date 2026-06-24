import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthForm } from "@/components/AuthForm";
import { Card, CardBody } from "@/components/ui";
import { SetupRequiredScreen, supabaseConfigured } from "@/components/SetupRequired";

export const metadata = { title: "Sign in" };

function safeNext(next?: string): string | undefined {
  return next && next.startsWith("/") ? next : undefined;
}

export default async function SignInPage({
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

  const signUpHref = dest ? `/sign-up?next=${encodeURIComponent(dest)}` : "/sign-up";

  return (
    <div className="mx-auto max-w-md px-4 sm:px-6 pt-12 sm:pt-20">
      <Card>
        <CardBody className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold">Sign in</h1>
            <p className="mt-1 text-sm text-muted">
              Use your phone number and password.
            </p>
          </div>
          <AuthForm mode="sign-in" next={dest} />
          <p className="text-sm text-muted text-center">
            New here?{" "}
            <Link href={signUpHref} className="text-accent hover:underline">
              Create an account
            </Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
