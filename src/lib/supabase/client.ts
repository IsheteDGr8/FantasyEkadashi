import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

/**
 * Returns the public Supabase config if it was inlined into the browser bundle,
 * or null if not. NEXT_PUBLIC_* values are baked in at build time, so if these
 * are missing the env vars weren't set when the app was built — set them in your
 * hosting provider and redeploy.
 */
export function getBrowserSupabaseConfig(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function createClient() {
  const cfg = getBrowserSupabaseConfig();
  if (!cfg) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in the browser. " +
        "Set them in your hosting environment and redeploy (they're inlined at build time).",
    );
  }
  return createBrowserClient<Database>(cfg.url, cfg.anonKey);
}
