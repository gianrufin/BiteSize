import { enqueueMutation } from "@/lib/offline/mutationQueue";

export type OfflineFetchResult =
  | { status: "ok"; response: Response }
  | { status: "queued" };

// A drop-in for fetch() on mutation calls (PATCH/POST/DELETE): if the device
// is offline, or the request fails with a real network error (flaky
// connections lie about navigator.onLine), the mutation is queued for replay
// instead of surfacing as a failure. Callers apply their existing optimistic
// local-state update either way and only need to branch on "queued" to skip
// error handling that isn't actually an error.
export async function offlineFetch(
  url: string,
  options: RequestInit & { method: string },
  meta?: Record<string, string>,
): Promise<OfflineFetchResult> {
  const isKnownOffline = typeof navigator !== "undefined" && navigator.onLine === false;

  if (!isKnownOffline) {
    try {
      const response = await fetch(url, options);
      return { status: "ok", response };
    } catch {
      // Fall through to queueing below.
    }
  }

  enqueueMutation(
    url,
    options.method,
    typeof options.body === "string" ? options.body : null,
    meta,
  );
  return { status: "queued" };
}
