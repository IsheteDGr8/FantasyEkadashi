import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthForm } from "@/components/AuthForm";
import { Card, CardBody } from "@/components/ui";
import { SetupRequiredScreen, supabaseConfigured } from "@/components/SetupRequired";

export const metadata = { title: "Create account" };

export default async function SignUpPage() {
  if (!supabaseConfigured()) return <SetupRequiredScreen />;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-md px-4 sm:px-6 pt-12 sm:pt-20">
      <Card>
        <CardBody className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold">Create your account</h1>
            <p className="mt-1 text-sm text-muted">
              Your name is shown to other players. Your phone number is private —
              it&apos;s only your login. No SMS is ever sent.
            </p>
          </div>
          <AuthForm mode="sign-up" />
          <p className="text-sm text-muted text-center">
            Already have an account?{" "}
            <Link href="/sign-in" className="text-accent hover:underline">
              Sign in
            </Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
