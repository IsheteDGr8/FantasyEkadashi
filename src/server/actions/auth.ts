"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/auth";
import { normalizeEmail } from "@/lib/utils";

export type AuthResult =
  | { error: string }
  | { ok: true; needsConfirmation?: boolean };

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

/** Origin for the email confirmation link (prefer explicit env, else request). */
async function siteOrigin(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "";
}

const SignUpSchema = z.object({
  displayName: z.string().trim().min(2, "Name must be at least 2 characters").max(40),
  email: z.string().trim().min(1, "Email is required"),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

export async function signUp(formData: FormData): Promise<AuthResult> {
  const parsed = SignUpSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const email = normalizeEmail(parsed.data.email);
  if (!email) return { error: "That doesn't look like a valid email address." };

  const origin = await siteOrigin();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName },
      emailRedirectTo: origin ? `${origin}/auth/confirm` : undefined,
    },
  });

  if (error) {
    if (error.code === "email_provider_disabled") {
      return {
        error:
          "Sign-up is blocked: enable the Email provider in Supabase (Authentication → Providers → Email).",
      };
    }
    return { error: error.message };
  }

  // Supabase returns a user with an empty identities array when the email is
  // already registered (to avoid leaking which emails exist).
  if (data.user && (data.user.identities?.length ?? 0) === 0) {
    return { error: "An account with this email already exists. Try signing in." };
  }

  // Grant admin if the email is on the allowlist (profile row exists via trigger).
  if (data.user && isAdminEmail(email)) {
    const admin = createAdminClient();
    await admin.from("profiles").update({ is_admin: true }).eq("id", data.user.id);
  }

  // If email confirmation is on, there's no session yet — tell the UI to ask
  // the user to check their inbox. If it's off, a session was created.
  return { ok: true, needsConfirmation: !data.session };
}

const SignInSchema = z.object({
  email: z.string().trim().min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

export async function signIn(formData: FormData): Promise<AuthResult> {
  const parsed = SignInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const email = normalizeEmail(parsed.data.email);
  if (!email) return { error: "That doesn't look like a valid email address." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  });
  if (error) {
    if (error.code === "email_not_confirmed") {
      return {
        error:
          "Please confirm your email first — click the link we sent to your inbox, then sign in.",
      };
    }
    if (error.code === "email_provider_disabled") {
      return {
        error:
          "Sign-in is disabled in Supabase. Enable the Email provider (Authentication → Providers → Email).",
      };
    }
    return { error: "Wrong email or password." };
  }
  return { ok: true };
}
