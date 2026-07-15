"use client";

import { useEffect, useRef, useState } from "react";
import { formatCents } from "@/lib/format";
import { computeEvenSplit, computeSplit, roundShareCents } from "@/lib/calculations/splitEngine";
import { buildSummaryText } from "@/lib/session/summaryText";
import { ChargesEditor } from "@/components/ChargesEditor";
import { Confetti } from "@/components/Confetti";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { ExportSummaryImage } from "@/components/ExportSummaryImage";
import { RoundingPreferenceSelector } from "@/components/RoundingPreferenceSelector";
import type { Item, PaymentStatus, Session } from "@/types";

export interface SummaryParticipant {
  id: string;
  name: string;
  isPayer: boolean;
  paymentStatus: PaymentStatus;
  paymentProofUrl: string | null;
  excludedFromCharges: boolean;
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
    | "currency"
    | "splitMode"
    | "chargeAllocationMode"
    | "roundingPreferenceCents"
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
  const [statusOverrides, setStatusOverrides] = useState<Record<string, PaymentStatus>>({});
  const [exclusionOverrides, setExclusionOverrides] = useState<Record<string, boolean>>({});
  const isLocked = session.status === "locked";

  function getPaymentStatus(participant: SummaryParticipant): PaymentStatus {
    return statusOverrides[participant.id] ?? participant.paymentStatus;
  }

  function getExcludedFromCharges(participant: SummaryParticipant): boolean {
    return exclusionOverrides[participant.id] ?? participant.excludedFromCharges;
  }

  async function toggleExcludedFromCharges(participantId: string, next: boolean) {
    setExclusionOverrides((prev) => ({ ...prev, [participantId]: next }));
    try {
      const res = await fetch(
        `/api/sessions/${sessionCode}/participants/${participantId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ excludedFromCharges: next }),
        },
      );
      if (!res.ok) throw new Error("Could not update");
    } catch {
      setExclusionOverrides((prev) => {
        const rest = { ...prev };
        delete rest[participantId];
        return rest;
      });
    }
  }

  async function setPaymentStatus(participantId: string, next: PaymentStatus) {
    setStatusOverrides((prev) => ({ ...prev, [participantId]: next }));
    try {
      const res = await fetch(
        `/api/sessions/${sessionCode}/participants/${participantId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentStatus: next }),
        },
      );
      if (!res.ok) throw new Error("Could not update payment status");
    } catch {
      setStatusOverrides((prev) => {
        const next = { ...prev };
        delete next[participantId];
        return next;
      });
    }
  }

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

  const isEvenSplit = session.splitMode === "even";

  const split = computeSplit(
    items.map((item) => ({ id: item.id, totalPriceCents: item.totalPriceCents })),
    claims,
    participants.map((p) => ({
      id: p.id,
      isPayer: p.isPayer,
      excludedFromCharges: getExcludedFromCharges(p),
    })),
    {
      taxCents: session.taxCents,
      serviceChargeCents: session.serviceChargeCents,
      tipCents: session.tipCents,
      discountCents: session.discountCents,
      grandTotalCents: session.grandTotalCents,
    },
    session.chargeAllocationMode,
  );

  const evenAllocations = computeEvenSplit(
    session.grandTotalCents,
    participants.map((p) => ({ id: p.id, isPayer: p.isPayer })),
  );

  const allocationByParticipantId = new Map(
    (isEvenSplit ? evenAllocations : split.allocations).map((a) => [
      a.participantId,
      a,
    ]),
  );

  function getShareCents(participantId: string): number {
    return roundShareCents(
      allocationByParticipantId.get(participantId)?.totalCents ?? 0,
      session.roundingPreferenceCents,
    );
  }

  const summaryParticipants = participants.map((participant) => ({
    name: participant.name,
    isPayer: participant.isPayer,
    amountCents: participant.isPayer ? session.grandTotalCents : getShareCents(participant.id),
  }));

  const summaryText = buildSummaryText(
    session.name ?? "Bill",
    session.grandTotalCents,
    summaryParticipants,
    session.currency,
  );

  const hasCharges =
    session.taxCents > 0 ||
    session.serviceChargeCents > 0 ||
    session.tipCents > 0 ||
    session.discountCents > 0;

  const nonPayerParticipants = participants.filter((p) => !p.isPayer);
  const totalOwedCents = nonPayerParticipants.reduce(
    (sum, p) => sum + getShareCents(p.id),
    0,
  );
  const collectedCents = nonPayerParticipants
    .filter((p) => getPaymentStatus(p) === "confirmed")
    .reduce((sum, p) => sum + getShareCents(p.id), 0);
  const pendingCount = nonPayerParticipants.filter(
    (p) => getPaymentStatus(p) === "submitted",
  ).length;

  const isFullySettled =
    nonPayerParticipants.length > 0 &&
    totalOwedCents > 0 &&
    collectedCents === totalOwedCents;

  const wasFullySettled = useRef(isFullySettled);
  const [celebrationKey, setCelebrationKey] = useState(0);
  useEffect(() => {
    if (isFullySettled && !wasFullySettled.current) {
      setCelebrationKey((prev) => prev + 1);
    }
    wasFullySettled.current = isFullySettled;
  }, [isFullySettled]);

  return (
    <div className="flex flex-col gap-6">
      <Confetti celebrationKey={celebrationKey} />
      {isFullySettled ? (
        <div className="card p-4 text-center">
          <p className="text-lg font-medium text-text">🎉 All settled up!</p>
          <p className="mt-1 text-sm text-muted">
            Everyone has paid — nothing left to collect.
          </p>
        </div>
      ) : null}
      <div className="card p-5 text-center">
        {isLocked ? (
          <p className="mb-1 text-xs font-medium text-amber">🔒 Locked</p>
        ) : null}
        <p className="text-sm text-muted">Total bill</p>
        <p className="text-4xl font-semibold text-text">
          {formatCents(session.grandTotalCents, session.currency)}
        </p>
        {totalOwedCents > 0 ? (
          <p className="mt-1 text-sm text-muted">
            {formatCents(collectedCents, session.currency)} collected of{" "}
            {formatCents(totalOwedCents, session.currency)}
            {pendingCount > 0
              ? ` · ${pendingCount} pending confirmation`
              : ""}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <CopyLinkButton
            text={summaryText}
            label="Copy Summary"
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-accent"
          />
          <ExportSummaryImage
            billName={session.name ?? "Bill"}
            grandTotalCents={session.grandTotalCents}
            currency={session.currency}
            participants={summaryParticipants}
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

      {!isEvenSplit && split.unclaimedItemIds.length > 0 ? (
        <div className="rounded-2xl border border-amber/40 bg-surface p-4">
          <p className="text-sm font-medium text-amber">
            {formatCents(split.unclaimedCents, session.currency)} in items unclaimed
          </p>
          <p className="mt-1 text-sm text-muted">
            {split.unclaimedItemIds.length} item
            {split.unclaimedItemIds.length === 1 ? "" : "s"} on this bill
            {" "}hasn&apos;t been claimed by anyone yet.
          </p>
        </div>
      ) : null}

      {isLocked ? (
        <div className="card p-4 text-center text-sm text-muted">
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
          currency={session.currency}
          initialAllocationMode={session.chargeAllocationMode}
          onSessionUpdate={setSession}
        />
      )}

      {!isLocked ? (
        <RoundingPreferenceSelector
          sessionCode={sessionCode}
          initialValue={session.roundingPreferenceCents}
          onSessionUpdate={setSession}
        />
      ) : null}

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted">
          Participants ({participants.length})
        </h2>
        <div className="flex flex-col gap-2">
          {participants.map((participant) => {
            const isPayer = participant.isPayer;
            const amountCents = isPayer
              ? session.grandTotalCents
              : getShareCents(participant.id);

            const paymentStatus = getPaymentStatus(participant);

            return (
              <div key={participant.id} className="card px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full icon-well text-sm font-medium text-accent">
                      {participant.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-text">
                        {isPayer ? "You" : participant.name}
                        {isPayer ? (
                          <span className="ml-2 rounded-full icon-well px-2 py-0.5 text-xs font-medium text-accent">
                            Payer
                          </span>
                        ) : null}
                      </p>
                      {!isPayer ? <p className="text-xs text-muted">Owes you</p> : null}
                    </div>
                  </div>
                  <span className="font-medium text-text">
                    {formatCents(amountCents, session.currency)}
                  </span>
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
                    </div>
                  </div>
                ) : null}

                {!isPayer && !isEvenSplit && hasCharges ? (
                  <label className="mt-2 flex items-center gap-2 border-t border-border pt-2 text-sm text-muted">
                    <input
                      type="checkbox"
                      checked={!getExcludedFromCharges(participant)}
                      onChange={(e) =>
                        toggleExcludedFromCharges(participant.id, !e.target.checked)
                      }
                      className="h-4 w-4 accent-accent"
                    />
                    Include in tax / service charge / tip
                  </label>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted">Breakdown</h2>
        <div className="flex flex-col gap-2 card p-4">
          <BreakdownRow
            label="Items"
            cents={session.subtotalCents}
            currency={session.currency}
          />
          {session.taxCents > 0 ? (
            <BreakdownRow label="Tax" cents={session.taxCents} currency={session.currency} />
          ) : null}
          {session.serviceChargeCents > 0 ? (
            <BreakdownRow
              label="Service charge"
              cents={session.serviceChargeCents}
              currency={session.currency}
            />
          ) : null}
          {session.tipCents > 0 ? (
            <BreakdownRow label="Tip" cents={session.tipCents} currency={session.currency} />
          ) : null}
          {session.discountCents > 0 ? (
            <BreakdownRow
              label="Discount"
              cents={-session.discountCents}
              currency={session.currency}
            />
          ) : null}
          <div className="mt-1 flex items-center justify-between border-t border-border pt-2">
            <span className="font-medium text-text">Total</span>
            <span className="font-semibold text-text">
              {formatCents(session.grandTotalCents, session.currency)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function BreakdownRow({
  label,
  cents,
  currency,
}: {
  label: string;
  cents: number;
  currency: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-text">{formatCents(cents, currency)}</span>
    </div>
  );
}
