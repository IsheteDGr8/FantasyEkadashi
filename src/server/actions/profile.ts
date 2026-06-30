"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/auth";

export type ProfileResult = { error: string } | { ok: true };

const Schema = z.object({
  displayName: z.string().trim().min(2, "Name must be at least 2 characters").max(40),
});

/**
 * Update the signed-in user's display name. Email is the login identifier and
 * is verified, so it's not editable here. Admin status is kept in sync with the
 * allowlist (grant only; never auto-revoke).
 */
export async function updateProfile(formData: FormData): Promise<ProfileResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "You're not signed in." };
  const userId = auth.user.id;

  const parsed = Schema.safeParse({ displayName: formData.get("displayName") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const admin = createAdminClient();

  const { error: authErr } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: { display_name: parsed.data.displayName },
  });
  if (authErr) return { error: authErr.message };

  const update: { display_name: string; is_admin?: boolean } = {
    display_name: parsed.data.displayName,
  };
  if (isAdminEmail(auth.user.email)) update.is_admin = true;

  const { error: profErr } = await admin
    .from("profiles")
    .update(update)
    .eq("id", userId);
  if (profErr) return { error: profErr.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
