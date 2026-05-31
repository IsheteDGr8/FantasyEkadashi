// Server-only Supabase client that uses the service-role key. Bypasses RLS.
// NEVER import this file from a client component.
import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `Missing environment variable: ${name}. Did you create .env.local from .env.example?`,
    );
  }
  return v;
}

export function createAdminClient() {
  return createClient<Database>(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
