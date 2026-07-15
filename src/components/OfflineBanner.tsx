"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { flushQueue, getQueue, subscribeToQueue } from "@/lib/offline/mutationQueue";

export function OfflineBanner() {
  const router = useRouter();
  const [isOffline, setIsOffline] = useState(false);
  const [queueLength, setQueueLength] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // navigator.onLine and the queue are external browser/storage state, only
    // readable after mount — this sync-on-mount is the external-system case
    // the lint rule means to exempt, not a derived-state anti-pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsOffline(!navigator.onLine);
    setQueueLength(getQueue().length);

    const unsubscribe = subscribeToQueue((queue) => setQueueLength(queue.length));

    async function sync() {
      if (getQueue().length === 0) return;
      setIsSyncing(true);
      const { synced } = await flushQueue();
      setIsSyncing(false);
      if (synced > 0) router.refresh();
    }

    function handleOnline() {
      setIsOffline(false);
      sync();
    }
    function handleOffline() {
      setIsOffline(true);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // A connection that's already up when this mounts still needs a catch-up
    // flush — mutations can be queued while this component isn't mounted yet.
    if (navigator.onLine) sync();

    return () => {
      unsubscribe();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [router]);

  if (!isOffline && queueLength === 0 && !isSyncing) return null;

  return (
    <div
      className={`fixed inset-x-0 top-0 z-40 px-4 py-2 text-center text-sm font-medium text-white ${
        isOffline ? "bg-amber" : "bg-accent"
      }`}
    >
      {isOffline
        ? queueLength > 0
          ? `Offline — ${queueLength} change${queueLength === 1 ? "" : "s"} will sync when you're back`
          : "You're offline — changes will be saved and synced later"
        : isSyncing
          ? "Back online — syncing…"
          : null}
    </div>
  );
}
