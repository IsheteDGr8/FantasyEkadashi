"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient, getBrowserSupabaseConfig } from "@/lib/supabase/client";

/**
 * Subscribes to Supabase Realtime changes and refreshes the current route's
 * server components when relevant rows change — so leagues, matchups, and
 * submissions update live without anyone hitting refresh.
 *
 * Row-level security scopes events to data the signed-in user may read, so even
 * the unfiltered subscriptions only deliver this user's groups' changes.
 */
export function RealtimeRefresh({
  channelName,
  groupId,
  matchId,
  matchIds,
  userId,
}: {
  channelName: string;
  groupId?: string;
  matchId?: string;
  /** Limit submission events (no group_id column) to these matches. */
  matchIds?: string[];
  /** Dashboard: watch everything in this user's groups. */
  userId?: string;
}) {
  const router = useRouter();
  const matchIdsKey = matchIds?.join(",") ?? "";

  useEffect(() => {
    // Live updates are an enhancement: if the browser Supabase config isn't
    // present, skip silently so the page still works.
    if (!getBrowserSupabaseConfig()) return;

    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      return;
    }

    let channel: RealtimeChannel | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 250);
    };

    const onSubmission = (payload: { new?: unknown; old?: unknown }) => {
      const allowed = matchIdsKey ? matchIdsKey.split(",") : null;
      const row = (payload.new ?? payload.old) as { match_id?: string };
      if (!allowed || (row?.match_id && allowed.includes(row.match_id))) refresh();
    };

    const ch = supabase.channel(channelName);

    if (groupId) {
      ch.on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: `group_id=eq.${groupId}` }, () => refresh());
      ch.on("postgres_changes", { event: "*", schema: "public", table: "group_members", filter: `group_id=eq.${groupId}` }, () => refresh());
      ch.on("postgres_changes", { event: "*", schema: "public", table: "groups", filter: `id=eq.${groupId}` }, () => refresh());
      ch.on("postgres_changes", { event: "*", schema: "public", table: "submissions" }, onSubmission);
    }

    if (matchId) {
      ch.on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: `id=eq.${matchId}` }, () => refresh());
      ch.on("postgres_changes", { event: "*", schema: "public", table: "submissions", filter: `match_id=eq.${matchId}` }, () => refresh());
    }

    if (userId) {
      ch.on("postgres_changes", { event: "*", schema: "public", table: "group_members", filter: `user_id=eq.${userId}` }, () => refresh());
      ch.on("postgres_changes", { event: "*", schema: "public", table: "groups" }, () => refresh());
      ch.on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => refresh());
    }

    channel = ch;

    // Authorize realtime for this user so RLS-filtered events come through.
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session?.access_token) {
        supabase.realtime.setAuth(data.session.access_token);
      }
      ch.subscribe();
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (channel) supabase.removeChannel(channel);
    };
  }, [channelName, groupId, matchId, userId, matchIdsKey, router]);

  return null;
}
