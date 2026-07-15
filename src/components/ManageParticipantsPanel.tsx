"use client";

import { useState } from "react";
import { formatCents } from "@/lib/format";
import { Avatar } from "@/components/Avatar";
import { getSuggestedParticipants, recordParticipantUsage } from "@/lib/session/recentParticipants";
import type { PaymentStatus } from "@/types";

export interface ManagedParticipant {
  id: string;
  name: string;
  isPayer: boolean;
  paymentStatus: PaymentStatus;
  paymentProofUrl: string | null;
  excludedFromCharges: boolean;
}

export function ManageParticipantsPanel({
  sessionCode,
  initialParticipants,
  claims,
  currency,
  grandTotalCents,
  isLocked,
  isEvenSplit,
  hasCharges,
  getPaymentStatus,
  setPaymentStatus,
  getExcludedFromCharges,
  toggleExcludedFromCharges,
  getShareCents,
}: {
  sessionCode: string;
  initialParticipants: ManagedParticipant[];
  claims: { itemId: string; participantId: string }[];
  currency: string;
  grandTotalCents: number;
  isLocked: boolean;
  isEvenSplit: boolean;
  hasCharges: boolean;
  getPaymentStatus: (participant: ManagedParticipant) => PaymentStatus;
  setPaymentStatus: (participantId: string, next: PaymentStatus) => void;
  getExcludedFromCharges: (participant: ManagedParticipant) => boolean;
  toggleExcludedFromCharges: (participantId: string, next: boolean) => void;
  getShareCents: (participantId: string) => number;
}) {
  const [participants, setParticipants] = useState(initialParticipants);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [newName, setNewName] = useState("");
  const [isAddingParticipant, setIsAddingParticipant] = useState(false);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [isBulkRemoving, setIsBulkRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const payer = participants.find((p) => p.isPayer);
  const guests = participants.filter((p) => !p.isPayer);
  const allSelected = guests.length > 0 && guests.every((p) => selectedIds.has(p.id));
  const suggestions = getSuggestedParticipants(participants.map((p) => p.name));

  function itemCount(participantId: string): number {
    return claims.filter((c) => c.participantId === participantId).length;
  }

  async function addParticipant(name: string) {
    setError(null);
    setIsAddingParticipant(true);
    try {
      const res = await fetch(`/api/sessions/${sessionCode}/participants/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not add participant");
      setParticipants((prev) => [...prev, data.participant]);
      recordParticipantUsage(data.participant.name);
      setNewName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsAddingParticipant(false);
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds(allSelected ? new Set() : new Set(guests.map((p) => p.id)));
  }

  async function removeParticipant(id: string) {
    if (!window.confirm("Remove this participant? Any items they claimed become unclaimed.")) {
      return;
    }
    setRemovingId(id);
    try {
      const res = await fetch(`/api/sessions/${sessionCode}/participants/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Could not remove participant");
      setParticipants((prev) => prev.filter((p) => p.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch {
      setError("Could not remove that participant — please try again.");
    } finally {
      setRemovingId(null);
    }
  }

  async function removeSelected() {
    if (selectedIds.size === 0) return;
    if (
      !window.confirm(
        `Remove ${selectedIds.size} participant${selectedIds.size === 1 ? "" : "s"}? Any items they claimed become unclaimed.`,
      )
    ) {
      return;
    }
    setIsBulkRemoving(true);
    try {
      const res = await fetch(`/api/sessions/${sessionCode}/participants/remove-bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantIds: [...selectedIds] }),
      });
      if (!res.ok) throw new Error("Could not remove participants");
      setParticipants((prev) => prev.filter((p) => !selectedIds.has(p.id)));
      setSelectedIds(new Set());
    } catch {
      setError("Could not remove the selected participants — please try again.");
    } finally {
      setIsBulkRemoving(false);
    }
  }

  async function moveGuest(id: string, direction: -1 | 1) {
    if (!payer) return;
    const index = guests.findIndex((p) => p.id === id);
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= guests.length) return;

    const reordered = [...guests];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    const previousGuests = guests;
    setParticipants([payer, ...reordered]);
    setMovingId(id);
    try {
      const res = await fetch(`/api/sessions/${sessionCode}/participants/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: [payer.id, ...reordered.map((p) => p.id)] }),
      });
      if (!res.ok) throw new Error("Could not reorder");
    } catch {
      setParticipants([payer, ...previousGuests]);
    } finally {
      setMovingId(null);
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted">
          Participants ({participants.length})
        </h2>
        {!isLocked && guests.length > 0 ? (
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-muted">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className="h-4 w-4 accent-accent"
              />
              Select all
            </label>
            {selectedIds.size > 0 ? (
              <button
                type="button"
                onClick={removeSelected}
                disabled={isBulkRemoving}
                className="text-xs font-medium text-amber disabled:opacity-60"
              >
                {isBulkRemoving ? "Removing…" : `Remove (${selectedIds.size})`}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        {participants.map((participant) => {
          const isPayer = participant.isPayer;
          const amountCents = isPayer ? grandTotalCents : getShareCents(participant.id);
          const paymentStatus = getPaymentStatus(participant);
          const guestIndex = guests.findIndex((p) => p.id === participant.id);

          return (
            <div key={participant.id} className="card px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  {!isPayer && !isLocked ? (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(participant.id)}
                      onChange={() => toggleSelected(participant.id)}
                      className="h-4 w-4 shrink-0 accent-accent"
                      aria-label={`Select ${participant.name}`}
                    />
                  ) : null}
                  <Avatar id={participant.id} name={isPayer ? "You" : participant.name} />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-text">
                      {isPayer ? "You" : participant.name}
                      {isPayer ? (
                        <span className="ml-2 rounded-full icon-well px-2 py-0.5 text-xs font-medium text-accent">
                          Payer
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted">
                      {!isPayer ? "Owes you · " : ""}
                      {itemCount(participant.id)} item{itemCount(participant.id) === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-medium text-text">
                    {formatCents(amountCents, currency)}
                  </span>
                  {!isPayer && !isLocked ? (
                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => moveGuest(participant.id, -1)}
                        disabled={guestIndex <= 0 || movingId === participant.id}
                        aria-label="Move up"
                        className="text-xs text-muted disabled:opacity-30"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => moveGuest(participant.id, 1)}
                        disabled={guestIndex >= guests.length - 1 || movingId === participant.id}
                        aria-label="Move down"
                        className="text-xs text-muted disabled:opacity-30"
                      >
                        ▼
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              {!isPayer ? (
                <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      paymentStatus === "confirmed"
                        ? "icon-well text-accent"
                        : paymentStatus === "submitted"
                          ? "bg-amber/15 text-amber"
                          : "text-muted"
                    }`}
                  >
                    {paymentStatus === "confirmed"
                      ? "✓ Paid"
                      : paymentStatus === "submitted"
                        ? "Payment sent"
                        : "Unpaid"}
                  </span>
                  <div className="flex items-center gap-3">
                    {participant.paymentProofUrl ? (
                      <a
                        href={participant.paymentProofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-accent"
                      >
                        View proof
                      </a>
                    ) : null}
                    {paymentStatus === "submitted" ? (
                      <button
                        type="button"
                        onClick={() => setPaymentStatus(participant.id, "confirmed")}
                        className="text-sm font-medium text-accent"
                      >
                        Confirm
                      </button>
                    ) : null}
                    {paymentStatus !== "unpaid" ? (
                      <button
                        type="button"
                        onClick={() => setPaymentStatus(participant.id, "unpaid")}
                        className="text-sm text-muted"
                      >
                        Reset
                      </button>
                    ) : null}
                    {!isLocked ? (
                      <button
                        type="button"
                        onClick={() => removeParticipant(participant.id)}
                        disabled={removingId === participant.id}
                        className="text-sm text-amber disabled:opacity-60"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {!isEvenSplit && hasCharges ? (
                <label className="mt-2 flex items-center gap-2 border-t border-border pt-2 text-sm text-muted">
                  <input
                    type="checkbox"
                    checked={!getExcludedFromCharges(participant)}
                    onChange={(e) => toggleExcludedFromCharges(participant.id, !e.target.checked)}
                    className="h-4 w-4 accent-accent"
                  />
                  Include in tax / service charge / tip / delivery fee
                </label>
              ) : null}
            </div>
          );
        })}
      </div>

      {!isLocked ? (
        <div className="mt-3 flex flex-col gap-2">
          {suggestions.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((name) => (
                <button
                  key={name}
                  type="button"
                  disabled={isAddingParticipant}
                  onClick={() => addParticipant(name)}
                  className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted disabled:opacity-60"
                >
                  + {name}
                </button>
              ))}
            </div>
          ) : null}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newName.trim()) addParticipant(newName.trim());
            }}
            className="flex gap-2"
          >
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Add a participant by name"
              className="min-w-0 flex-1 rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={isAddingParticipant || !newName.trim()}
              className="shrink-0 rounded-xl border border-border px-3 py-2 text-sm font-medium text-accent disabled:opacity-60"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => addParticipant("")}
              disabled={isAddingParticipant}
              className="shrink-0 rounded-xl border border-dashed border-border px-3 py-2 text-sm font-medium text-accent disabled:opacity-60"
            >
              + Guest
            </button>
          </form>
        </div>
      ) : null}

      {error ? <p className="mt-2 text-sm text-amber">{error}</p> : null}
    </div>
  );
}
