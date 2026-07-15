// Device-local memory of which first-time hints have already been dismissed,
// so a coach-mark banner shows once ever, not on every visit.
const STORAGE_KEY = "bitesize_seen_hints";

function readSeen(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

export function hasSeenHint(id: string): boolean {
  return readSeen().has(id);
}

export function markHintSeen(id: string): void {
  if (typeof window === "undefined") return;
  const seen = readSeen();
  seen.add(id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen]));
}
