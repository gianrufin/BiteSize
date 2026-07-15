"use client";

import { useState } from "react";
import { HelpTooltip } from "@/components/HelpTooltip";
import type { RoundingPreferenceCents, Session } from "@/types";

const OPTIONS: { value: RoundingPreferenceCents; label: string }[] = [
  { value: 1, label: "Exact" },
  { value: 100, label: "₱1" },
  { value: 500, label: "₱5" },
  { value: 1000, label: "₱10" },
];

export function RoundingPreferenceSelector({
  sessionCode,
  initialValue,
  disabled = false,
  onSessionUpdate,
}: {
  sessionCode: string;
  initialValue: RoundingPreferenceCents;
  disabled?: boolean;
  onSessionUpdate?: (session: Session) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const [isSaving, setIsSaving] = useState(false);

  async function handleChange(next: RoundingPreferenceCents) {
    if (next === value || isSaving) return;
    const previous = value;
    setValue(next);
    setIsSaving(true);
    try {
      const res = await fetch(`/api/sessions/${sessionCode}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundingPreferenceCents: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error("Could not update rounding preference");
      if (data.session) onSessionUpdate?.(data.session);
    } catch {
      setValue(previous);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="card p-4">
      <p className="mb-2 flex items-center gap-1.5 text-sm text-muted">
        Round each person&apos;s share to nearest
        <HelpTooltip text="Rounds what each person owes to a whole amount for easier cash payment. Any difference from rounding is absorbed by the payer, so the bill total still stays accurate." />
      </p>
      <div className="flex rounded-xl border border-border bg-bg p-1">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={disabled || isSaving}
            onClick={() => handleChange(option.value)}
            className={`flex-1 rounded-lg px-2 py-2 text-sm font-medium transition disabled:opacity-60 ${
              value === option.value ? "bg-accent text-accent-foreground" : "text-muted"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
