"use client";

import { useState } from "react";

export function GCashNumberCard({
  sessionCode,
  initialGcashNumber,
}: {
  sessionCode: string;
  initialGcashNumber: string | null;
}) {
  const [gcashNumber, setGcashNumber] = useState(initialGcashNumber);
  const [isEditing, setIsEditing] = useState(!initialGcashNumber);
  const [inputValue, setInputValue] = useState(initialGcashNumber ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const res = await fetch(`/api/sessions/${sessionCode}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gcashNumber: inputValue }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not save");
      setGcashNumber(data.session.gcashNumber);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSaving(false);
    }
  }

  if (!isEditing) {
    return (
      <div className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3">
        <div>
          <p className="text-sm text-muted">GCash number</p>
          <p className="font-medium text-text">{gcashNumber}</p>
        </div>
        <button
          onClick={() => {
            setInputValue(gcashNumber ?? "");
            setIsEditing(true);
          }}
          className="text-sm font-medium text-accent"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSave}
      className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4"
    >
      <label className="text-sm text-muted" htmlFor="gcash-number">
        GCash number
      </label>
      <p className="text-xs text-muted">
        So people you&apos;re owed by can send payment straight to you.
      </p>
      <input
        id="gcash-number"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="09171234567"
        inputMode="numeric"
        className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
      />
      {error ? <p className="text-sm text-amber">{error}</p> : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSaving}
          className="flex-1 rounded-xl bg-accent px-4 py-2 font-medium text-accent-foreground disabled:opacity-60"
        >
          {isSaving ? "Saving…" : "Save"}
        </button>
        {gcashNumber ? (
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="rounded-xl border border-border px-4 py-2 font-medium text-text"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
