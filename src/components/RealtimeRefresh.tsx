"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

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
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 250);
    };

    (async () => {
      // Authorize realtime for this user so RLS-filtered events come through.
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) {
        supabase.realtime.setAuth(data.session.access_token);
      }

      const ch = supabase.channel(channelName);

      if (groupId) {
        ch.on(
          "postgres_changes",
          { event: "*", schema: "public", table: "matches", filter: `group_id=eq.${groupId}` },
          () => refresh(),
        );
        ch.on(
          "postgres_changes",
          { event: "*", schema: "public", table: "group_members", filter: `group_id=eq.${groupId}` },
          () => refresh(),
        );
        ch.on(
          "postgres_changes",
          { event: "*", schema: "public", table: "groups", filter: `id=eq.${groupId}` },
          () => refresh(),
        );
        ch.on(
          "postgres_changes",
          { event: "*", schema: "public", table: "submissions" },
          (payload) => {
            const allowed = matchIdsKey ? matchIdsKey.split(",") : null;
            const row = (payload.new ?? payload.old) as { match_id?: string };
            if (!allowed || (row.match_id && allowed.includes(row.match_id))) refresh();
          },
        );
      }

      if (matchId) {
        ch.on(
          "postgres_changes",
          { event: "*", schema: "public", table: "matches", filter: `id=eq.${matchId}` },
          () => refresh(),
        );
        ch.on(
          "postgres_changes",
          { event: "*", schema: "public", table: "submissions", filter: `match_id=eq.${matchId}` },
          () => refresh(),
        );
      }

      if (userId) {
        ch.on(
          "postgres_changes",
          { event: "*", schema: "public", table: "group_members", filter: `user_id=eq.${userId}` },
          () => refresh(),
        );
        ch.on("postgres_changes", { event: "*", schema: "public", table: "groups" }, () => refresh());
        ch.on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => refresh());
      }

      ch.subscribe();
      channel = ch;
    })();

    return () => {
      if (timer) clearTimeout(timer);
      if (channel) supabase.removeChannel(channel);
    };
  }, [channelName, groupId, matchId, userId, matchIdsKey, router]);

  return null;
}
