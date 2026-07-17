"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TripStatus } from "@/types";

export function TripSettleControls({
  tripCode,
  status,
}: {
  tripCode: string;
  status: TripStatus;
}) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  async function toggleSettled() {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/trips/${tripCode}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: status === "settled" ? "open" : "settled" }),
      });
      if (!res.ok) throw new Error("Could not update this trip");
      router.refresh();
    } catch {
      // Refresh will just show the trip unchanged — no separate error UI
      // needed for a single toggle action like this.
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggleSettled}
      disabled={isSaving}
      className="mt-2 text-sm font-medium text-accent disabled:opacity-60"
    >
      {status === "settled" ? "Reopen trip" : "Mark trip as settled"}
    </button>
  );
}
