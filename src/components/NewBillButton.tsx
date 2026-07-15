"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewBillButton() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setIsCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Could not start a new bill");
      const { code } = await res.json();
      router.push(`/s/${code}`);
    } catch {
      setError("Something went wrong — please try again.");
      setIsCreating(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={isCreating}
        className="flex w-full items-center gap-4 rounded-2xl border border-border bg-surface px-4 py-4 text-left transition hover:bg-surface-muted disabled:opacity-60"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <ScanIcon />
        </div>
        <div className="flex-1">
          <p className="font-medium text-text">
            {isCreating ? "Starting your bill…" : "Scan a receipt"}
          </p>
          <p className="text-sm text-muted">Upload or take a photo</p>
        </div>
        <ChevronIcon />
      </button>
      {error ? <p className="mt-2 text-sm text-amber">{error}</p> : null}
    </div>
  );
}

function ScanIcon() {
  return (
    <svg
      width="20"
      height="20"
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

function ChevronIcon() {
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
      className="text-muted"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
