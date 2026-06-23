"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminPhoneAllowlist } from "@/lib/auth";
import { normalizePhone, phoneToSyntheticEmail } from "@/lib/utils";

export type ProfileResult = { error: string } | { ok: true };

const Schema = z.object({
  displayName: z.string().trim().min(2, "Name must be at least 2 characters").max(40),
  phone: z.string().trim().min(1, "Phone number is required"),
});

/**
 * Update the signed-in user's display name and/or phone number.
 *
 * The phone is the login identifier (mapped to a synthetic email), so changing
 * it also updates the auth user's email. The session stays valid because it's
 * tied to the user id, not the email.
 */
export async function updateProfile(formData: FormData): Promise<ProfileResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "You're not signed in." };
  const userId = auth.user.id;

  const parsed = Schema.safeParse({
    displayName: formData.get("displayName"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const phone = normalizePhone(parsed.data.phone);
  if (!phone) return { error: "That doesn't look like a valid phone number." };

  const admin = createAdminClient();
  const { data: current } = await admin
    .from("profiles")
    .select("phone")
    .eq("id", userId)
    .single();
  const phoneChanged = (current?.phone ?? null) !== phone;

  if (phoneChanged) {
    const { error: authErr } = await admin.auth.admin.updateUserById(userId, {
      email: phoneToSyntheticEmail(phone),
      email_confirm: true,
      user_metadata: { display_name: parsed.data.displayName, phone },
    });
    if (authErr) {
      if (
        authErr.message.toLowerCase().includes("already") ||
        authErr.status === 422
      ) {
        return { error: "That phone number is already used by another account." };
      }
      return { error: authErr.message };
    }
  } else {
    const { error: authErr } = await admin.auth.admin.updateUserById(userId, {
      user_metadata: { display_name: parsed.data.displayName, phone },
    });
    if (authErr) return { error: authErr.message };
  }

  const update: { display_name: string; phone: string; is_admin?: boolean } = {
    display_name: parsed.data.displayName,
    phone,
  };
  // Keep admin status in sync with the allowlist (grant only; never auto-revoke).
  if (adminPhoneAllowlist().includes(phone.replace(/\D/g, ""))) {
    update.is_admin = true;
  }
  const { error: profErr } = await admin
    .from("profiles")
    .update(update)
    .eq("id", userId);
  if (profErr) return { error: profErr.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
