import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { joinLeague } from "@/server/actions/leagues";
import { Card, CardBody, Button, Input, Label } from "@/components/ui";

export const metadata = { title: "Join league" };

export default async function JoinLeaguePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/sign-in?next=/leagues/join");

  return (
    <div className="mx-auto max-w-md px-4 sm:px-6 py-12">
      <Card>
        <CardBody className="space-y-5">
          <div>
            <h1 className="text-2xl font-semibold">Join a league</h1>
            <p className="mt-1 text-sm text-muted">
              Enter the 6-character invite code your friend gave you.
            </p>
          </div>

          <form action={joinLeague} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="code">Invite code</Label>
              <Input
                id="code"
                name="code"
                required
                minLength={4}
                maxLength={12}
                autoCapitalize="characters"
                autoComplete="off"
                className="uppercase tracking-[0.3em] font-mono text-center text-lg"
                placeholder="ABCDEF"
              />
            </div>

            <Button type="submit" size="lg" className="w-full">
              Join
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
