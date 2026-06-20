import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `Missing environment variable: ${name}. Create .env.local from .env.example.`,
    );
  }
  return v;
}

export function createClient() {
  return createBrowserClient<Database>(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );
}
