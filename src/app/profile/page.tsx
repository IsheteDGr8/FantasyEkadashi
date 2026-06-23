import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { ProfileForm } from "@/components/ProfileForm";
import { Card, CardBody, Badge } from "@/components/ui";
import { SetupRequiredScreen, supabaseConfigured } from "@/components/SetupRequired";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  if (!supabaseConfigured()) return <SetupRequiredScreen />;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/sign-in");

  return (
    <div className="mx-auto max-w-md px-4 sm:px-6 py-12">
      <Card>
        <CardBody className="space-y-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">Your profile</h1>
              {profile.is_admin && <Badge variant="accent">admin</Badge>}
            </div>
            <p className="mt-1 text-sm text-muted">
              Update your name or phone number.
            </p>
          </div>
          <ProfileForm
            initialName={profile.display_name}
            initialPhone={profile.phone ?? ""}
          />
          <p className="text-sm text-center">
            <Link href="/dashboard" className="text-accent hover:underline">
              ← Back to dashboard
            </Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
