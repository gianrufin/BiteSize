"use client";

import { useState } from "react";
import { formatCents } from "@/lib/format";
import type { Item } from "@/types";

export interface AssignableParticipant {
  id: string;
  name: string;
}

export interface AssignableClaim {
  itemId: string;
  participantId: string;
  participantName: string;
}

export function AssignItemsPanel({
  sessionCode,
  items,
  initialClaims,
  participants,
  currency,
  isBillLocked = false,
}: {
  sessionCode: string;
  items: Item[];
  initialClaims: AssignableClaim[];
  participants: AssignableParticipant[];
  currency: string;
  isBillLocked?: boolean;
}) {
  const [claims, setClaims] = useState(initialClaims);
  const [bulkParticipantId, setBulkParticipantId] = useState(participants[0]?.id ?? "");
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);
  const [reassigningItemId, setReassigningItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const unclaimedItems = items.filter(
    (item) => !claims.some((c) => c.itemId === item.id),
  );

  async function assignItem(itemId: string, participantId: string) {
    setError(null);
    setReassigningItemId(itemId);
    try {
      const res = await fetch(`/api/sessions/${sessionCode}/claims/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, participantId }),
      });
      if (!res.ok) throw new Error("Could not reassign item");
      const participantName = participants.find((p) => p.id === participantId)?.name ?? "Someone";
      setClaims((prev) => [
        ...prev.filter((c) => c.itemId !== itemId),
        { itemId, participantId, participantName },
      ]);
    } catch {
      setError("Could not reassign that item — please try again.");
    } finally {
      setReassigningItemId(null);
    }
  }

  async function assignAllUnclaimed() {
    if (!bulkParticipantId) return;
    setError(null);
    setIsBulkAssigning(true);
    try {
      const res = await fetch(`/api/sessions/${sessionCode}/claims/assign-unclaimed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: bulkParticipantId }),
      });
      if (!res.ok) throw new Error("Could not assign unclaimed items");
      const participantName = participants.find((p) => p.id === bulkParticipantId)?.name ?? "Someone";
      setClaims((prev) => [
        ...prev,
        ...unclaimedItems.map((item) => ({
          itemId: item.id,
          participantId: bulkParticipantId,
          participantName,
        })),
      ]);
    } catch {
      setError("Could not assign the unclaimed items — please try again.");
    } finally {
      setIsBulkAssigning(false);
    }
  }

  if (items.length === 0 || participants.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {!isBillLocked && unclaimedItems.length > 0 ? (
        <div className="flex items-center gap-2 card p-3">
          <select
            value={bulkParticipantId}
            onChange={(e) => setBulkParticipantId(e.target.value)}
            className="min-w-0 flex-1 rounded-xl border border-border bg-bg px-2 py-2 text-sm text-text outline-none"
          >
            {participants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={assignAllUnclaimed}
            disabled={isBulkAssigning}
            className="btn-primary shrink-0 px-3 py-2 text-sm font-medium disabled:opacity-60"
          >
            {isBulkAssigning
              ? "Assigning…"
              : `Assign ${unclaimedItems.length} unclaimed`}
          </button>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        {items.map((item) => {
          const claimants = claims.filter((c) => c.itemId === item.id);
          const singleClaimantId =
            claimants.length === 1 ? claimants[0].participantId : "";
          return (
            <div key={item.id} className="flex items-center gap-3 card px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-text">{item.name}</p>
                <p className="text-sm text-muted">
                  {formatCents(item.totalPriceCents, currency)}
                  {claimants.length > 0
                    ? ` · ${claimants.map((c) => c.participantName).join(", ")}`
                    : " · Unclaimed"}
                </p>
              </div>
              {!isBillLocked ? (
                <select
                  value={singleClaimantId}
                  disabled={reassigningItemId === item.id}
                  onChange={(e) => {
                    if (e.target.value) assignItem(item.id, e.target.value);
                  }}
                  className="shrink-0 rounded-xl border border-border bg-bg px-2 py-1.5 text-sm text-text outline-none disabled:opacity-60"
                >
                  <option value="">Assign to…</option>
                  {participants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
          );
        })}
      </div>

      {error ? <p className="text-sm text-amber">{error}</p> : null}
    </div>
  );
}
