import type { RecentBill } from "@/types";

const STORAGE_KEY = "bitesize_recent_bills";
const MAX_ENTRIES = 20;

function readAll(): RecentBill[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RecentBill[]) : [];
  } catch {
    return [];
  }
}

export function getRecentBills(): RecentBill[] {
  return readAll().sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export function upsertRecentBill(bill: RecentBill): void {
  if (typeof window === "undefined") return;
  const existing = readAll().filter((b) => b.code !== bill.code);
  const updated = [bill, ...existing].slice(0, MAX_ENTRIES);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}
