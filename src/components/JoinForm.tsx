"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function JoinForm({ code }: { code: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsJoining(true);
    try {
      const res = await fetch(`/api/sessions/${code}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not join");
      }
      router.push(`/s/${code}`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong — please try again.",
      );
      setIsJoining(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Enter your name"
        required
        className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-text outline-none focus:border-accent"
      />
      {error ? <p className="text-sm text-amber">{error}</p> : null}
      <button
        type="submit"
        disabled={isJoining}
        className="w-full btn-primary px-4 py-3 font-medium disabled:opacity-60"
      >
        {isJoining ? "Joining…" : "Join Bill"}
      </button>
    </form>
  );
}
