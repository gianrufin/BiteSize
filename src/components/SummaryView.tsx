"use client";

import { useState } from "react";
import { formatCents } from "@/lib/format";
import { computeSplit } from "@/lib/calculations/splitEngine";
import { buildSummaryText } from "@/lib/session/summaryText";
import { ChargesEditor } from "@/components/ChargesEditor";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import type { Item, Session } from "@/types";

export interface SummaryParticipant {
  id: string;
  name: string;
  isPayer: boolean;
}

export interface SummaryClaim {
  itemId: string;
  participantId: string;
}

export function SummaryView({
  sessionCode,
  initialSession,
  items,
  participants,
  claims,
}: {
  sessionCode: string;
  initialSession: Pick<
    Session,
    | "name"
    | "status"
    | "subtotalCents"
    | "taxCents"
    | "serviceChargeCents"
    | "tipCents"
    | "discountCents"
    | "grandTotalCents"
  >;
  items: Item[];
  participants: SummaryParticipant[];
  claims: SummaryClaim[];
}) {
  const [session, setSession] = useState(initialSession);
  const [isTogglingLock, setIsTogglingLock] = useState(false);
  const isLocked = session.status === "locked";

  async function toggleLock() {
    setIsTogglingLock(true);
    try {
      const res = await fetch(`/api/sessions/${sessionCode}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locked: !isLocked }),
      });
      if (!res.ok) throw new Error("Could not update lock state");
      const data = await res.json();
      setSession(data.session);
    } catch {
      // Best-effort — the button just stays clickable to retry.
    } finally {
      setIsTogglingLock(false);
    }
  }

  const split = computeSplit(
    items.map((item) => ({ id: item.id, totalPriceCents: item.totalPriceCents })),
    claims,
    participants.map((p) => ({ id: p.id, isPayer: p.isPayer })),
    {
      taxCents: session.taxCents,
      serviceChargeCents: session.serviceChargeCents,
      tipCents: session.tipCents,
      discountCents: session.discountCents,
      grandTotalCents: session.grandTotalCents,
    },
  );

  const allocationByParticipantId = new Map(
    split.allocations.map((a) => [a.participantId, a]),
  );

  const summaryText = buildSummaryText(
    session.name ?? "Bill",
    session.grandTotalCents,
    participants.map((participant) => ({
      name: participant.name,
      isPayer: participant.isPayer,
      amountCents: participant.isPayer
        ? session.grandTotalCents
        : (allocationByParticipantId.get(participant.id)?.totalCents ?? 0),
    })),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-border bg-surface p-5 text-center">
        {isLocked ? (
          <p className="mb-1 text-xs font-medium text-amber">🔒 Locked</p>
        ) : null}
        <p className="text-sm text-muted">Total bill</p>
        <p className="text-4xl font-semibold text-text">
          {formatCents(session.grandTotalCents)}
        </p>
        <div className="mt-3 flex justify-center gap-2">
          <CopyLinkButton
            text={summaryText}
            label="Copy Summary"
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-accent"
          />
          <button
            onClick={toggleLock}
            disabled={isTogglingLock}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-text disabled:opacity-60"
          >
            {isLocked ? "Unlock bill" : "Lock bill"}
          </button>
        </div>
      </div>

      {split.unclaimedItemIds.length > 0 ? (
        <div className="rounded-2xl border border-amber/40 bg-surface p-4">
          <p className="text-sm font-medium text-amber">
            {formatCents(split.unclaimedCents)} in items unclaimed
          </p>
          <p className="mt-1 text-sm text-muted">
            {split.unclaimedItemIds.length} item
            {split.unclaimedItemIds.length === 1 ? "" : "s"} on this bill
            {" "}hasn&apos;t been claimed by anyone yet.
          </p>
        </div>
      ) : null}

      {isLocked ? (
        <div className="rounded-2xl border border-border bg-surface p-4 text-center text-sm text-muted">
          Charges are locked. Unlock the bill to make changes.
        </div>
      ) : (
        <ChargesEditor
          sessionCode={sessionCode}
          initialCharges={{
            taxCents: session.taxCents,
            serviceChargeCents: session.serviceChargeCents,
            tipCents: session.tipCents,
            discountCents: session.discountCents,
          }}
          onSessionUpdate={setSession}
        />
      )}

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted">
          Participants ({participants.length})
        </h2>
        <div className="flex flex-col gap-2">
          {participants.map((participant) => {
            const isPayer = participant.isPayer;
            const amountCents = isPayer
              ? session.grandTotalCents
              : (allocationByParticipantId.get(participant.id)?.totalCents ?? 0);

            return (
              <div
                key={participant.id}
                className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-medium text-accent">
                    {participant.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-text">
                      {isPayer ? "You" : participant.name}
                      {isPayer ? (
                        <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
                          Payer
                        </span>
                      ) : null}
                    </p>
                    {!isPayer ? <p className="text-xs text-muted">Owes you</p> : null}
                  </div>
                </div>
                <span className="font-medium text-text">{formatCents(amountCents)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted">Breakdown</h2>
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
          <BreakdownRow label="Items" cents={session.subtotalCents} />
          {session.taxCents > 0 ? <BreakdownRow label="Tax" cents={session.taxCents} /> : null}
          {session.serviceChargeCents > 0 ? (
            <BreakdownRow label="Service charge" cents={session.serviceChargeCents} />
          ) : null}
          {session.tipCents > 0 ? <BreakdownRow label="Tip" cents={session.tipCents} /> : null}
          {session.discountCents > 0 ? (
            <BreakdownRow label="Discount" cents={-session.discountCents} />
          ) : null}
          <div className="mt-1 flex items-center justify-between border-t border-border pt-2">
            <span className="font-medium text-text">Total</span>
            <span className="font-semibold text-text">
              {formatCents(session.grandTotalCents)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function BreakdownRow({ label, cents }: { label: string; cents: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-text">{formatCents(cents)}</span>
    </div>
  );
}
