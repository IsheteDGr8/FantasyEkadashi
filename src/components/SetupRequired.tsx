import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Card, CardBody } from "./ui";

export function supabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function SetupRequiredScreen() {
  return (
    <div className="mx-auto max-w-xl px-4 sm:px-6 py-12 sm:py-20">
      <Card className="border-accent/30">
        <CardBody className="space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={22} className="text-accent shrink-0 mt-0.5" />
            <div>
              <h1 className="text-xl font-semibold">Finish setting up Supabase</h1>
              <p className="mt-1 text-sm text-foreground/80">
                The database/auth layer isn&apos;t connected yet, so this page
                can&apos;t load. It takes about 5 minutes.
              </p>
            </div>
          </div>
          <ol className="space-y-3 text-sm text-foreground/80 list-decimal pl-5">
            <li>
              Create a free project at{" "}
              <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-accent underline">
                supabase.com
              </a>.
            </li>
            <li>
              In the Supabase <strong>SQL editor</strong>, paste and run{" "}
              <code className="text-accent">supabase/schema.sql</code>.
            </li>
            <li>
              In <strong>Authentication → Sign In / Providers → Email</strong>:
              turn the <strong>Email provider ON</strong> and turn{" "}
              <strong>&ldquo;Confirm email&rdquo; OFF</strong> (we use phone +
              password on synthetic emails, so there&apos;s no inbox to confirm).
            </li>
            <li>
              Copy <code className="text-accent">.env.example</code> to{" "}
              <code className="text-accent">.env.local</code> and fill in the
              three keys from <strong>Settings → API</strong>.
            </li>
            <li>
              Restart <code className="text-accent">npm run dev</code>.
            </li>
          </ol>
          <Link href="/" className="text-sm text-accent hover:underline inline-block">
            ← Back to home
          </Link>
        </CardBody>
      </Card>
    </div>
  );
}
