"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setLastSplitMode } from "@/lib/session/settings";
import type { SplitMode } from "@/types";

const OPTIONS: { value: SplitMode; label: string }[] = [
  { value: "items", label: "By item" },
  { value: "even", label: "Split evenly" },
];

export function SplitModeToggle({
  sessionCode,
  initialSplitMode,
  disabled = false,
}: {
  sessionCode: string;
  initialSplitMode: SplitMode;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [splitMode, setSplitMode] = useState(initialSplitMode);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSelect(next: SplitMode) {
    if (next === splitMode || isSaving) return;
    const previous = splitMode;
    setSplitMode(next);
    setIsSaving(true);
    try {
      const res = await fetch(`/api/sessions/${sessionCode}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ splitMode: next }),
      });
      if (!res.ok) throw new Error("Could not update split mode");
      setLastSplitMode(next);
      router.refresh();
    } catch {
      setSplitMode(previous);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex rounded-xl border border-border bg-bg p-1">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled || isSaving}
          onClick={() => handleSelect(option.value)}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition disabled:opacity-60 ${
            splitMode === option.value
              ? "bg-accent text-accent-foreground"
              : "text-muted"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
