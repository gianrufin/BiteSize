"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getRecentBills, setRecentBillArchived } from "@/lib/session/recentBills";
import { formatCents } from "@/lib/format";
import { DuplicateBillButton } from "@/components/DuplicateBillButton";
import type { RecentBill, RecentBillStatus } from "@/types";

type Tab = "all" | RecentBillStatus | "archived";

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "awaiting", label: "Awaiting" },
  { id: "settled", label: "Settled" },
  { id: "archived", label: "Archived" },
];

function statusLabel(status: RecentBillStatus): string {
  if (status === "draft") return "Draft";
  if (status === "settled") return "Settled";
  return "Awaiting payment";
}

function statusClassName(status: RecentBillStatus): string {
  if (status === "settled") return "icon-well text-accent";
  if (status === "awaiting") return "bg-amber/15 text-amber";
  return "text-muted";
}

function monthKey(dateIso: string): string {
  const d = new Date(dateIso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function RecentBillsList() {
  const [bills, setBills] = useState<RecentBill[] | null>(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("all");

  function reload() {
    setBills(getRecentBills());
  }

  useEffect(() => {
    // localStorage isn't available during SSR, so the real list can only be read
    // after mount — this sync-on-mount is the external-system case the lint rule
    // means to exempt, not a derived-state anti-pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, []);

  const monthlySpending = useMemo(() => {
    if (!bills) return [];
    const totals = new Map<string, number>();
    for (const bill of bills) {
      if (bill.archived || bill.role !== "payer") continue;
      const key = `${monthKey(bill.date)}|${bill.currency}`;
      totals.set(key, (totals.get(key) ?? 0) + bill.totalCents);
    }
    return [...totals.entries()]
      .map(([key, cents]) => {
        const [month, currency] = key.split("|");
        return { month, currency, cents };
      })
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 3);
  }, [bills]);

  if (bills === null) return null;
  if (bills.length === 0) return null;

  const filtered = bills.filter((bill) => {
    if (tab === "archived") {
      if (!bill.archived) return false;
    } else {
      if (bill.archived) return false;
      if (tab !== "all" && bill.status !== tab) return false;
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      const haystack = `${bill.name} ${bill.venueName ?? ""} ${bill.code}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  return (
    <section className="mt-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted">Recent Bills</h2>
      </div>

      {monthlySpending.length > 0 ? (
        <div className="mb-4 flex flex-col gap-1 card p-4">
          <p className="mb-1 text-xs font-medium text-muted">Monthly spending</p>
          {monthlySpending.map(({ month, currency, cents }) => (
            <div key={`${month}-${currency}`} className="flex items-center justify-between text-sm">
              <span className="text-text">{monthLabel(month)}</span>
              <span className="font-medium text-text">{formatCents(cents, currency)}</span>
            </div>
          ))}
        </div>
      ) : null}

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search bills…"
        className="mb-3 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
      />

      <div className="mb-3 flex gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
              tab === t.id ? "btn-primary" : "border border-border text-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">No bills match here.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((bill) => (
            <li key={bill.code} className="card px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <Link
                  href={`/s/${bill.code}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full icon-well text-accent">
                    <ReceiptIcon />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-text">{bill.name}</p>
                    <p className="truncate text-sm text-muted">
                      {bill.venueName ? `${bill.venueName} · ` : ""}
                      {new Date(bill.date).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </Link>
                <span className="shrink-0 font-medium text-text">
                  {formatCents(bill.totalCents, bill.currency)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClassName(bill.status)}`}
                  >
                    {statusLabel(bill.status)}
                  </span>
                  {bill.outstandingCents > 0 ? (
                    <span className="text-xs text-muted">
                      {bill.role === "payer" ? "Pending" : "You owe"}{" "}
                      {formatCents(bill.outstandingCents, bill.currency)}
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  {bill.role === "payer" ? (
                    <DuplicateBillButton
                      sessionCode={bill.code}
                      className="text-xs font-medium text-accent"
                    />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setRecentBillArchived(bill.code, !bill.archived);
                      reload();
                    }}
                    className="text-xs font-medium text-muted"
                  >
                    {bill.archived ? "Unarchive" : "Archive"}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ReceiptIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 2h9a2 2 0 0 1 2 2v18l-3-2-2 2-2-2-2 2-2-2-3 2V7l3-3Z" />
      <path d="M9 8h6M9 12h6" />
    </svg>
  );
}
