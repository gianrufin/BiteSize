"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getRecentBills } from "@/lib/session/recentBills";
import { formatCents } from "@/lib/format";
import type { RecentBill } from "@/types";

export function RecentBillsList() {
  const [bills, setBills] = useState<RecentBill[] | null>(null);

  useEffect(() => {
    // localStorage isn't available during SSR, so the real list can only be read
    // after mount — this sync-on-mount is the external-system case the lint rule
    // means to exempt, not a derived-state anti-pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBills(getRecentBills());
  }, []);

  if (bills === null) return null;
  if (bills.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted">Recent Bills</h2>
        <span className="text-sm text-muted">See all</span>
      </div>
      <ul className="flex flex-col gap-2">
        {bills.map((bill) => (
          <li key={bill.code}>
            <Link
              href={`/s/${bill.code}`}
              className="flex items-center justify-between card px-4 py-3 transition hover:bg-surface-muted"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full icon-well text-accent">
                  <ReceiptIcon />
                </div>
                <div>
                  <p className="font-medium text-text">{bill.name}</p>
                  <p className="text-sm text-muted">
                    {new Date(bill.date).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <span className="font-medium text-text">
                {formatCents(bill.totalCents, bill.currency)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
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
