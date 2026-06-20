"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminPhoneAllowlist } from "@/lib/auth";
import { normalizePhone, phoneToSyntheticEmail } from "@/lib/utils";

export type AuthResult = { error: string } | { ok: true };

/**
 * Sign out on the server so the httpOnly Supabase session cookies are actually
 * cleared (a client-side signOut can't delete server-set cookies reliably).
 */
export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

const SignUpSchema = z.object({
  displayName: z.string().trim().min(2, "Name must be at least 2 characters").max(40),
  phone: z.string().trim().min(1, "Phone number is required"),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

export async function signUp(formData: FormData): Promise<AuthResult> {
  const parsed = SignUpSchema.safeParse({
    displayName: formData.get("displayName"),
    phone: formData.get("phone"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const phone = normalizePhone(parsed.data.phone);
  if (!phone) {
    return { error: "That doesn't look like a valid phone number." };
  }
  const email = phoneToSyntheticEmail(phone);
  const digits = phone.replace(/\D/g, "");
  const isAdmin = adminPhoneAllowlist().includes(digits);

  const admin = createAdminClient();
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { display_name: parsed.data.displayName, phone },
  });

  if (createErr) {
    if (
      createErr.message.toLowerCase().includes("already") ||
      createErr.status === 422
    ) {
      return { error: "An account with this phone number already exists. Try signing in." };
    }
    return { error: createErr.message };
  }

  // Promote to admin if on the allowlist. (Profile row exists via trigger.)
  if (isAdmin && created.user) {
    await admin.from("profiles").update({ is_admin: true }).eq("id", created.user.id);
  }

  // Establish the session (sets cookies) via the SSR server client.
  const supabase = await createClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  });
  if (signInErr) {
    if (signInErr.code === "email_provider_disabled") {
      return {
        error:
          "Sign-in is blocked: enable the Email provider in Supabase (Authentication → Sign In / Providers → Email).",
      };
    }
    return { error: `Account created, but sign-in failed: ${signInErr.message}` };
  }
  return { ok: true };
}

const SignInSchema = z.object({
  phone: z.string().trim().min(1, "Phone number is required"),
  password: z.string().min(1, "Password is required"),
});

export async function signIn(formData: FormData): Promise<AuthResult> {
  const parsed = SignInSchema.safeParse({
    phone: formData.get("phone"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const phone = normalizePhone(parsed.data.phone);
  if (!phone) return { error: "That doesn't look like a valid phone number." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: phoneToSyntheticEmail(phone),
    password: parsed.data.password,
  });
  if (error) {
    if (error.code === "email_provider_disabled") {
      return {
        error:
          "Sign-in is disabled in Supabase. Enable the Email provider (Authentication → Sign In / Providers → Email).",
      };
    }
    return { error: "Wrong phone number or password." };
  }
  return { ok: true };
}
