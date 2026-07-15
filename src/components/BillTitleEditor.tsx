"use client";

import { useState } from "react";

export function BillTitleEditor({
  sessionCode,
  initialName,
  initialVenueName,
}: {
  sessionCode: string;
  initialName: string | null;
  initialVenueName: string | null;
}) {
  const [name, setName] = useState(initialName);
  const [venueName, setVenueName] = useState(initialVenueName);
  const [isEditing, setIsEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(initialName ?? "");
  const [venueDraft, setVenueDraft] = useState(initialVenueName ?? "");
  const [isSaving, setIsSaving] = useState(false);

  function startEditing() {
    setNameDraft(name ?? "");
    setVenueDraft(venueName ?? "");
    setIsEditing(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch(`/api/sessions/${sessionCode}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameDraft, venueName: venueDraft }),
      });
      if (!res.ok) throw new Error("Could not save");
      const data = await res.json();
      setName(data.session.name);
      setVenueName(data.session.venueName);
      setIsEditing(false);
    } catch {
      // Best-effort — the form just stays open so they can retry.
    } finally {
      setIsSaving(false);
    }
  }

  if (isEditing) {
    return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          placeholder="Bill name"
          autoFocus
          className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-xl font-semibold text-text outline-none focus:border-accent"
        />
        <input
          value={venueDraft}
          onChange={(e) => setVenueDraft(e.target.value)}
          placeholder="Restaurant (optional)"
          className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isSaving}
            className="btn-primary flex-1 px-3 py-1.5 text-sm font-medium disabled:opacity-60"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            disabled={isSaving}
            className="rounded-xl border border-border px-3 py-1.5 text-sm font-medium text-text"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <button type="button" onClick={startEditing} className="text-left">
      <h1 className="text-2xl font-semibold text-text">{name ?? "New bill"}</h1>
      {venueName ? <p className="text-sm text-muted">{venueName}</p> : null}
    </button>
  );
}
