"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddBillToTripButton({ tripCode }: { tripCode: string }) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setIsCreating(true);
    try {
      const res = await fetch(`/api/trips/${tripCode}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not add a bill");
      router.push(`/s/${data.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsCreating(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isCreating}
        className="w-full rounded-2xl border border-dashed border-border py-3 text-center text-sm font-medium text-accent disabled:opacity-60"
      >
        {isCreating ? "Starting…" : "+ Add a bill to this trip"}
      </button>
      {error ? <p className="mt-2 text-sm text-amber">{error}</p> : null}
    </div>
  );
}
