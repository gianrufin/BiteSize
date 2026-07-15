"use client";

import { useState } from "react";
import { formatCents } from "@/lib/format";
import { computeSplit } from "@/lib/calculations/splitEngine";
import type { Item } from "@/types";

export interface ClaimWithName {
  itemId: string;
  participantId: string;
  participantName: string;
}

export interface ClaimListCharges {
  taxCents: number;
  serviceChargeCents: number;
  tipCents: number;
  discountCents: number;
  grandTotalCents: number;
}

export function ItemClaimList({
  sessionCode,
  items,
  initialClaims,
  currentParticipantId,
  allParticipants,
  charges,
  isBillLocked = false,
}: {
  sessionCode: string;
  items: Item[];
  initialClaims: ClaimWithName[];
  currentParticipantId: string;
  allParticipants: { id: string; isPayer: boolean }[];
  charges: ClaimListCharges;
  isBillLocked?: boolean;
}) {
  const [claims, setClaims] = useState(initialClaims);
  const [sharedItemIds, setSharedItemIds] = useState(
    () => new Set(items.filter((item) => item.isShared).map((item) => item.id)),
  );
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const split = computeSplit(
    items.map((item) => ({ id: item.id, totalPriceCents: item.totalPriceCents })),
    claims.map((c) => ({ itemId: c.itemId, participantId: c.participantId })),
    allParticipants,
    charges,
  );
  const myShareCents =
    split.allocations.find((a) => a.participantId === currentParticipantId)?.totalCents ?? 0;

  // Optimistic: the checkbox flips the instant you tap it, before the request
  // resolves. Pending-disable still guards against a double-tap firing two
  // requests; failure rolls the local state back and surfaces an error.
  async function claimItem(itemId: string, markShared = false) {
    setError(null);
    const optimisticClaim = {
      itemId,
      participantId: currentParticipantId,
      participantName: "You",
    };
    setClaims((prev) => [...prev, optimisticClaim]);
    if (markShared) {
      setSharedItemIds((prev) => new Set(prev).add(itemId));
    }
    setPendingItemId(itemId);
    try {
      const res = await fetch(`/api/sessions/${sessionCode}/claims`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, markShared }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not claim item");
    } catch (err) {
      setClaims((prev) => prev.filter((c) => c !== optimisticClaim));
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPendingItemId(null);
    }
  }

  async function unclaimItem(itemId: string) {
    setError(null);
    const removedClaim = claims.find(
      (c) => c.itemId === itemId && c.participantId === currentParticipantId,
    );
    setClaims((prev) =>
      prev.filter(
        (c) => !(c.itemId === itemId && c.participantId === currentParticipantId),
      ),
    );
    setPendingItemId(itemId);
    try {
      const res = await fetch(`/api/sessions/${sessionCode}/claims/${itemId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Could not unclaim item");
    } catch {
      if (removedClaim) setClaims((prev) => [...prev, removedClaim]);
      setError("Something went wrong");
    } finally {
      setPendingItemId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {items.map((item) => {
          const claimantsForItem = claims.filter((c) => c.itemId === item.id);
          const claimedByMe = claimantsForItem.some(
            (c) => c.participantId === currentParticipantId,
          );
          const othersClaiming = claimantsForItem.filter(
            (c) => c.participantId !== currentParticipantId,
          );
          const isPending = pendingItemId === item.id;
          const isShared = sharedItemIds.has(item.id);
          const isLockedByOther = !claimedByMe && othersClaiming.length > 0 && !isShared;

          return (
            <div
              key={item.id}
              className="flex items-center gap-3 card px-4 py-3"
            >
              <button
                type="button"
                disabled={isPending || isLockedByOther || isBillLocked}
                onClick={() => (claimedByMe ? unclaimItem(item.id) : claimItem(item.id))}
                aria-label={claimedByMe ? "Unclaim item" : "Claim item"}
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${
                  claimedByMe
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border bg-bg"
                } disabled:opacity-50`}
              >
                {claimedByMe ? <CheckIcon /> : null}
              </button>

              <div className="flex-1">
                <p className="font-medium text-text">{item.name}</p>
                <p className="text-sm text-muted">
                  {formatCents(item.totalPriceCents)}
                  {othersClaiming.length > 0
                    ? ` · ${isShared ? "Shared with" : "Claimed by"} ${othersClaiming
                        .map((c) => c.participantName)
                        .join(", ")}`
                    : ""}
                </p>
              </div>

              {isLockedByOther && !isBillLocked ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => claimItem(item.id, true)}
                  className="shrink-0 rounded-lg px-2 py-1 text-sm font-medium text-accent"
                >
                  + Split with me
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      {isBillLocked ? (
        <p className="text-center text-sm text-muted">
          🔒 This bill is locked — claims can no longer be changed.
        </p>
      ) : null}

      {error ? <p className="text-sm text-amber">{error}</p> : null}

      <div className="sticky bottom-4 card-lg p-4 text-center">
        <p className="text-sm text-muted">You owe</p>
        <p className="text-3xl font-semibold text-text">{formatCents(myShareCents)}</p>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
