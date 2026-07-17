import type { Group } from "@/types";

// Device-local saved groups ("Barkada", "Officemates") for one-tap bulk-add to a
// new bill. Same storage philosophy as recentBills.ts / recentParticipants.ts —
// no accounts, no cross-device sync, scoped to this browser only.
const STORAGE_KEY = "bitesize_groups";

function readAll(): Group[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Group[]) : [];
  } catch {
    return [];
  }
}

function writeAll(groups: Group[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
}

function dedupeNames(names: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of names) {
    const trimmed = raw.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

export function getGroups(): Group[] {
  return readAll().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function createGroup(name: string, memberNames: string[]): Group {
  const now = new Date().toISOString();
  const group: Group = {
    id: crypto.randomUUID(),
    name: name.trim() || "Untitled group",
    memberNames: dedupeNames(memberNames),
    createdAt: now,
    updatedAt: now,
  };
  writeAll([group, ...readAll()]);
  return group;
}

export function updateGroup(
  id: string,
  updates: { name?: string; memberNames?: string[] },
): void {
  const next = readAll().map((group) =>
    group.id === id
      ? {
          ...group,
          ...(updates.name !== undefined ? { name: updates.name.trim() || group.name } : {}),
          ...(updates.memberNames !== undefined
            ? { memberNames: dedupeNames(updates.memberNames) }
            : {}),
          updatedAt: new Date().toISOString(),
        }
      : group,
  );
  writeAll(next);
}

export function deleteGroup(id: string): void {
  writeAll(readAll().filter((group) => group.id !== id));
}
