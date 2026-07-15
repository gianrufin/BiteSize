"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function JoinByCodeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    router.push(`/s/${trimmed}/join`);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Have a bill code? Enter it here"
        className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text outline-none focus:border-accent"
      />
      <button
        type="submit"
        disabled={!code.trim()}
        className="shrink-0 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-accent disabled:opacity-50"
      >
        Join
      </button>
    </form>
  );
}
