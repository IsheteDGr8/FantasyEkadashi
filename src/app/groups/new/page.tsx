import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createGroup } from "@/server/actions/groups";
import { Card, CardBody, Button, Input, Label } from "@/components/ui";
import { ActionForm } from "@/components/FormCard";
import { DEFAULT_TIMEZONE } from "@/lib/ekadashi";
import { SetupRequiredScreen, supabaseConfigured } from "@/components/SetupRequired";

export const metadata = { title: "New group" };

const COMMON_TZ = [
  "Asia/Kolkata", "America/Los_Angeles", "America/New_York", "America/Chicago",
  "America/Denver", "Europe/London", "Europe/Berlin", "Australia/Sydney",
  "Asia/Singapore", "Asia/Dubai",
];

export default async function NewGroupPage() {
  if (!supabaseConfigured()) return <SetupRequiredScreen />;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/sign-in");
  if (!profile.is_admin) {
    return (
      <div className="mx-auto max-w-md px-4 sm:px-6 py-12">
        <Card>
          <CardBody className="space-y-2 text-center">
            <h1 className="text-xl font-semibold">Admins only</h1>
            <p className="text-sm text-muted">
              Only admins can create groups. Ask the app owner to add your phone
              number to the admin list, then sign out and back in.
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 sm:px-6 py-12">
      <Card>
        <CardBody className="space-y-5">
          <div>
            <h1 className="text-2xl font-semibold">Start a new group</h1>
            <p className="mt-1 text-sm text-muted">
              You&apos;ll get a join code to share. The tournament begins when you
              press &ldquo;Start&rdquo;.
            </p>
          </div>
          <ActionForm action={createGroup} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Group name</Label>
              <Input id="name" name="name" required minLength={2} maxLength={60} placeholder="e.g. Powerful Pandavas" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="timezone">Timezone (Ekadashi day cutoff)</Label>
              <select
                id="timezone"
                name="timezone"
                defaultValue={DEFAULT_TIMEZONE}
                className="h-11 w-full rounded-xl border border-border bg-surface-2 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-accent/60"
              >
                {COMMON_TZ.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
            <Button type="submit" size="lg" className="w-full">Create group</Button>
          </ActionForm>
        </CardBody>
      </Card>
    </div>
  );
}
