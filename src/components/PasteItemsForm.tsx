"use client";

import { useState } from "react";
import { useUnsavedChangesWarning } from "@/lib/hooks/useUnsavedChangesWarning";
import type { Item, Session } from "@/types";

export function PasteItemsForm({
  sessionCode,
  onItemsAdded,
  onCancel,
}: {
  sessionCode: string;
  onItemsAdded: (items: Item[], session: Session) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useUnsavedChangesWarning(text.trim().length > 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/sessions/${sessionCode}/items/paste`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not read those items");
      onItemsAdded(data.items, data.session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 card p-4">
      <div>
        <label className="mb-1 block text-sm text-muted" htmlFor="paste-items">
          Paste items from notes or chat
        </label>
        <textarea
          id="paste-items"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"e.g.\n2x Burger 250\nFries 120\n1 Iced Tea 90"}
          rows={5}
          required
          autoFocus
          className="w-full scroll-mb-32 rounded-xl border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
        />
      </div>

      {error ? <p className="text-sm text-amber">{error}</p> : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting || !text.trim()}
          className="flex-1 btn-primary px-4 py-2 font-medium disabled:opacity-60"
        >
          {isSubmitting ? "Reading…" : "Add these items"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-xl border border-border px-4 py-2 font-medium text-text"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
