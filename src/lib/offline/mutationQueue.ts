// A small localStorage-backed queue of mutations that couldn't reach the
// server because the device was offline. Each entry is just enough to replay
// the original fetch() once connectivity returns — the queue itself doesn't
// know or care what the mutation means, that's each caller's job.
const STORAGE_KEY = "bitesize_offline_queue";

export interface QueuedMutation {
  id: string;
  url: string;
  method: string;
  body: string | null;
  createdAt: string;
  // Optional correlation key so a caller can find/update/cancel a mutation it
  // queued earlier — e.g. an item created offline gets a temp local id as
  // meta.tempId, so editing or deleting it again before it syncs can amend
  // (rather than duplicate) the still-queued create.
  meta?: Record<string, string>;
}

type Listener = (queue: QueuedMutation[]) => void;
const listeners = new Set<Listener>();

function readQueue(): QueuedMutation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as QueuedMutation[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedMutation[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  for (const listener of listeners) listener(queue);
}

export function getQueue(): QueuedMutation[] {
  return readQueue();
}

export function subscribeToQueue(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function enqueueMutation(
  url: string,
  method: string,
  body: string | null,
  meta?: Record<string, string>,
): QueuedMutation {
  const entry: QueuedMutation = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    url,
    method,
    body,
    createdAt: new Date().toISOString(),
    meta,
  };
  writeQueue([...readQueue(), entry]);
  return entry;
}

function removeMutation(id: string): void {
  writeQueue(readQueue().filter((m) => m.id !== id));
}

export function findQueuedMutationByMeta(key: string, value: string): QueuedMutation | undefined {
  return readQueue().find((m) => m.meta?.[key] === value);
}

// Amends an already-queued mutation's body in place (e.g. editing an item
// that was created offline and hasn't synced yet, before it syncs) instead of
// queueing a second mutation that would race or duplicate it.
export function updateQueuedMutation(id: string, body: string | null): void {
  writeQueue(readQueue().map((m) => (m.id === id ? { ...m, body } : m)));
}

// Cancels an already-queued mutation outright (e.g. deleting an item that was
// created offline and hasn't synced yet — there's nothing left to sync).
export function cancelQueuedMutation(id: string): void {
  removeMutation(id);
}

// Replays every queued mutation against the real network, in the order they
// were made, removing each as it succeeds. Stops at the first failure so a
// blip mid-flush doesn't reorder later writes ahead of ones still stuck.
export async function flushQueue(): Promise<{ synced: number; failed: boolean }> {
  let synced = 0;
  for (const mutation of readQueue()) {
    try {
      const res = await fetch(mutation.url, {
        method: mutation.method,
        headers: mutation.body ? { "Content-Type": "application/json" } : undefined,
        body: mutation.body ?? undefined,
      });
      if (!res.ok) return { synced, failed: true };
      removeMutation(mutation.id);
      synced++;
    } catch {
      return { synced, failed: true };
    }
  }
  return { synced, failed: false };
}
