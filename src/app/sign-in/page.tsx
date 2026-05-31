import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignInForm } from "./SignInForm";
import { Card, CardBody } from "@/components/ui";

export const metadata = { title: "Sign in" };

export default async function SignInPage() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) redirect("/dashboard");
  } catch {
    // env vars missing — let the form render; it'll surface the error.
  }

  return (
    <div className="mx-auto max-w-md px-4 sm:px-6 pt-12 sm:pt-20">
      <Card>
        <CardBody className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold">Sign in</h1>
            <p className="mt-1 text-sm text-muted">
              We&apos;ll email you a magic link — no password required.
            </p>
          </div>
          <SignInForm />
        </CardBody>
      </Card>
    </div>
  );
}
