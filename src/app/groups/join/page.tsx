import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { joinGroup } from "@/server/actions/groups";
import { Card, CardBody, Button, Input, Label } from "@/components/ui";
import { ActionForm } from "@/components/FormCard";
import { SetupRequiredScreen, supabaseConfigured } from "@/components/SetupRequired";

export const metadata = { title: "Join group" };

export default async function JoinGroupPage() {
  if (!supabaseConfigured()) return <SetupRequiredScreen />;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/sign-in");

  return (
    <div className="mx-auto max-w-md px-4 sm:px-6 py-12">
      <Card>
        <CardBody className="space-y-5">
          <div>
            <h1 className="text-2xl font-semibold">Join a group</h1>
            <p className="mt-1 text-sm text-muted">
              Enter the 6-character code your admin gave you.
            </p>
          </div>
          <ActionForm action={joinGroup} className="space-y-4">
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
            <Button type="submit" size="lg" className="w-full">Join</Button>
          </ActionForm>
        </CardBody>
      </Card>
    </div>
  );
}
