"use client";

import { useEffect } from "react";
import { upsertRecentBill } from "@/lib/session/recentBills";

// Invisible — records this bill in the device's local history so it shows up
// under "Recent Bills" on the landing page, letting a participant find their
// way back to their own amount/GCash info later without needing the link again.
export function TrackRecentBill({
  code,
  name,
  totalCents,
  currency,
  role,
}: {
  code: string;
  name: string;
  totalCents: number;
  currency: string;
  role: "payer" | "participant";
}) {
  useEffect(() => {
    upsertRecentBill({
      code,
      name,
      date: new Date().toISOString(),
      totalCents,
      currency,
      role,
    });
  }, [code, name, totalCents, currency, role]);

  return null;
}
