"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function StartTripForm() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || isCreating) return;
    setError(null);
    setIsCreating(true);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not start this trip");
      router.push(`/t/${data.trip.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsCreating(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="btn-primary w-full px-4 py-2.5 font-medium"
      >
        + Start a trip
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-2 p-4">
      <label className="text-sm text-muted" htmlFor="trip-name">
        Trip name
      </label>
      <input
        id="trip-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Boracay Weekend"
        autoFocus
        className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
      />
      {error ? <p className="text-sm text-amber">{error}</p> : null}
      <div className="mt-1 flex gap-2">
        <button
          type="submit"
          disabled={!name.trim() || isCreating}
          className="btn-primary flex-1 px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {isCreating ? "Starting…" : "Start trip"}
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
