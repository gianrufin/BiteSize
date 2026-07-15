// Device-local memory of commonly-ordered items, so re-adding "Iced Tea" on
// the next bill is a tap instead of retyping name + price. Tracked whenever
// an item is added manually (not from an OCR scan — those aren't "orders"
// in the same sense, they're transcriptions of someone else's receipt).
const STORAGE_KEY = "bitesize_recent_items";
const MAX_ENTRIES = 30;
const SUGGESTION_COUNT = 6;

export interface RecentItem {
  name: string;
  unitPriceCents: number;
  count: number;
  lastUsed: string;
}

function readAll(): RecentItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RecentItem[]) : [];
  } catch {
    return [];
  }
}

export function recordItemUsage(name: string, unitPriceCents: number): void {
  if (typeof window === "undefined") return;
  const trimmed = name.trim();
  if (!trimmed) return;

  const all = readAll();
  const existing = all.find((entry) => entry.name.toLowerCase() === trimmed.toLowerCase());

  const updated: RecentItem = existing
    ? { ...existing, name: trimmed, unitPriceCents, count: existing.count + 1, lastUsed: new Date().toISOString() }
    : { name: trimmed, unitPriceCents, count: 1, lastUsed: new Date().toISOString() };

  const next = [updated, ...all.filter((entry) => entry.name.toLowerCase() !== trimmed.toLowerCase())].slice(
    0,
    MAX_ENTRIES,
  );
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

// Ranked by frequency first, recency as the tiebreaker — a thing ordered 5
// times last month should still outrank something ordered once yesterday.
export function getSuggestedItems(): RecentItem[] {
  return readAll()
    .sort((a, b) => b.count - a.count || new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())
    .slice(0, SUGGESTION_COUNT);
}
