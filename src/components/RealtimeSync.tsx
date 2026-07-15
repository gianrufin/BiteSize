"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

// Invisible — just re-fetches the server-rendered page (router.refresh()) whenever
// items, claims, or participants change on this session, so payer and participant
// screens update live without anyone tapping refresh. Item_claims isn't filtered by
// session_id (it doesn't have that column, only item_id), so any claim change
// anywhere triggers a refresh; harmless at this app's scale, just a touch less
// precise than the items/participants subscriptions.
export function RealtimeSync({ sessionId }: { sessionId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const channel = supabase
      .channel(`session-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "items",
          filter: `session_id=eq.${sessionId}`,
        },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "participants",
          filter: `session_id=eq.${sessionId}`,
        },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "item_claims" },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, router]);

  return null;
}
