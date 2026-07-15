"use client";

import { useEffect } from "react";
import { upsertRecentBill } from "@/lib/session/recentBills";
import type { RecentBillStatus } from "@/types";

// Invisible — records this bill in the device's local history so it shows up
// under "Recent Bills" on the landing page, letting a participant find their
// way back to their own amount/GCash info later without needing the link again.
export function TrackRecentBill({
  code,
  name,
  venueName = null,
  totalCents,
  currency,
  role,
  status,
  outstandingCents,
}: {
  code: string;
  name: string;
  venueName?: string | null;
  totalCents: number;
  currency: string;
  role: "payer" | "participant";
  status: RecentBillStatus;
  outstandingCents: number;
}) {
  useEffect(() => {
    upsertRecentBill({
      code,
      name,
      venueName,
      date: new Date().toISOString(),
      totalCents,
      currency,
      role,
      status,
      outstandingCents,
    });
  }, [code, name, venueName, totalCents, currency, role, status, outstandingCents]);

  return null;
}
