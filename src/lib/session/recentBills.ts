import type { RecentBill } from "@/types";

const STORAGE_KEY = "bitesize_recent_bills";
const MAX_ENTRIES = 40;

function readAll(): RecentBill[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RecentBill[]) : [];
  } catch {
    return [];
  }
}

function writeAll(bills: RecentBill[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bills));
}

export function getRecentBills(): RecentBill[] {
  return readAll().sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export function upsertRecentBill(bill: RecentBill): void {
  if (typeof window === "undefined") return;
  const existing = readAll();
  const prior = existing.find((b) => b.code === bill.code);
  const merged: RecentBill = {
    ...bill,
    // Archiving is a device-local decision the payer/participant made on this
    // list — a routine revisit to the bill itself shouldn't silently undo it.
    archived: bill.archived ?? prior?.archived ?? false,
  };
  const updated = [merged, ...existing.filter((b) => b.code !== bill.code)].slice(
    0,
    MAX_ENTRIES,
  );
  writeAll(updated);
}

export function setRecentBillArchived(code: string, archived: boolean): void {
  if (typeof window === "undefined") return;
  const updated = readAll().map((b) => (b.code === code ? { ...b, archived } : b));
  writeAll(updated);
}
