// Device-local memory of names the payer has added to past bills, so
// recreating "the usual crew" on a new bill is a few taps instead of
// retyping everyone. Recorded only when the payer explicitly adds someone
// (see participants/add) — not for people who self-join, since that name
// belongs to their own device, not this one.
const STORAGE_KEY = "bitesize_recent_participants";
const MAX_ENTRIES = 30;
const SUGGESTION_COUNT = 8;

interface RecentParticipant {
  name: string;
  count: number;
  lastUsed: string;
}

function readAll(): RecentParticipant[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RecentParticipant[]) : [];
  } catch {
    return [];
  }
}

export function recordParticipantUsage(name: string): void {
  if (typeof window === "undefined") return;
  const trimmed = name.trim();
  // Auto-generated "Guest N" placeholders aren't a real recurring person —
  // no point suggesting them again later.
  if (!trimmed || /^Guest \d+$/i.test(trimmed)) return;

  const all = readAll();
  const existing = all.find((entry) => entry.name.toLowerCase() === trimmed.toLowerCase());

  const updated: RecentParticipant = existing
    ? { ...existing, name: trimmed, count: existing.count + 1, lastUsed: new Date().toISOString() }
    : { name: trimmed, count: 1, lastUsed: new Date().toISOString() };

  const next = [updated, ...all.filter((entry) => entry.name.toLowerCase() !== trimmed.toLowerCase())].slice(
    0,
    MAX_ENTRIES,
  );
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function getSuggestedParticipants(excludeNames: string[] = []): string[] {
  const excluded = new Set(excludeNames.map((n) => n.toLowerCase()));
  return readAll()
    .filter((entry) => !excluded.has(entry.name.toLowerCase()))
    .sort((a, b) => b.count - a.count || new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())
    .slice(0, SUGGESTION_COUNT)
    .map((entry) => entry.name);
}
