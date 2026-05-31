import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createLeague } from "@/server/actions/leagues";
import { Card, CardBody, Button, Input, Label } from "@/components/ui";
import { DEFAULT_TIMEZONE } from "@/lib/ekadashi";

export const metadata = { title: "New league" };

const COMMON_TZ = [
  "Asia/Kolkata",
  "America/Los_Angeles",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "Europe/London",
  "Europe/Berlin",
  "Australia/Sydney",
  "Asia/Singapore",
  "Asia/Dubai",
];

export default async function NewLeaguePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/sign-in");

  return (
    <div className="mx-auto max-w-md px-4 sm:px-6 py-12">
      <Card>
        <CardBody className="space-y-5">
          <div>
            <h1 className="text-2xl font-semibold">Start a new league</h1>
            <p className="mt-1 text-sm text-muted">
              You&apos;ll get an invite code to share with friends. The
              tournament begins when you press &ldquo;Start&rdquo;.
            </p>
          </div>

          <form action={createLeague} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">League name</Label>
              <Input
                id="name"
                name="name"
                required
                minLength={2}
                maxLength={60}
                placeholder="e.g. Roomies of Vrindavan"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="timezone">Timezone (for Ekadashi day cutoff)</Label>
              <select
                id="timezone"
                name="timezone"
                defaultValue={DEFAULT_TIMEZONE}
                className="h-11 w-full rounded-xl border border-border bg-surface-2 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-accent/60"
              >
                {COMMON_TZ.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted">
                Ekadashi dates are computed in this timezone for the whole
                league.
              </p>
            </div>

            <Button type="submit" size="lg" className="w-full">
              Create league
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
