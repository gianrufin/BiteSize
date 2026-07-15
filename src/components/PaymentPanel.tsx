"use client";

import { useRef, useState } from "react";
import { formatCents } from "@/lib/format";
import { resizeImageForUpload } from "@/lib/image/resizeForUpload";
import type { PaymentMethod, PaymentStatus } from "@/types";

const METHOD_LABELS: Record<PaymentMethod, string> = {
  gcash: "GCash",
  cash: "Cash",
  other: "Other",
};

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function PaymentPanel({
  sessionCode,
  participantId,
  billName,
  amountCents,
  currency,
  gcashNumber,
  gcashQrUrl,
  initialPaymentStatus,
  initialProofUrl,
  initialPaymentMethod = "gcash",
  initialPaymentReference,
  initialPaymentNote,
  initialAmountPaidCents = 0,
  initialSubmittedAt,
  initialConfirmedAt,
}: {
  sessionCode: string;
  participantId: string;
  billName: string;
  amountCents: number;
  currency: string;
  gcashNumber: string | null;
  gcashQrUrl: string | null;
  initialPaymentStatus: PaymentStatus;
  initialProofUrl: string | null;
  initialPaymentMethod?: PaymentMethod;
  initialPaymentReference?: string | null;
  initialPaymentNote?: string | null;
  initialAmountPaidCents?: number;
  initialSubmittedAt?: string | null;
  initialConfirmedAt?: string | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState(initialPaymentStatus);
  const [proofUrl, setProofUrl] = useState(initialProofUrl);
  const [method, setMethod] = useState<PaymentMethod>(initialPaymentMethod);
  const [reference, setReference] = useState(initialPaymentReference ?? "");
  const [note, setNote] = useState(initialPaymentNote ?? "");
  const [amountPaidCents, setAmountPaidCents] = useState(initialAmountPaidCents);
  const [submittedAt, setSubmittedAt] = useState(initialSubmittedAt ?? null);
  const [confirmedAt, setConfirmedAt] = useState(initialConfirmedAt ?? null);
  const [showDetails, setShowDetails] = useState(false);
  const [payingCustomAmount, setPayingCustomAmount] = useState(false);
  const [customAmount, setCustomAmount] = useState((amountCents / 100).toFixed(2));
  const [qrRevealed, setQrRevealed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [copiedNote, setCopiedNote] = useState(false);

  const remainingCents = Math.max(0, amountCents - amountPaidCents);

  async function markPaid() {
    setError(null);
    setIsSaving(true);
    const paidCents = payingCustomAmount
      ? Math.round(Number(customAmount) * 100) || 0
      : amountCents;
    try {
      const res = await fetch(
        `/api/sessions/${sessionCode}/participants/${participantId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentStatus: "submitted",
            paymentMethod: method,
            paymentReference: reference,
            paymentNote: note,
            amountPaidCents: paidCents,
          }),
        },
      );
      if (!res.ok) throw new Error("Could not update payment status");
      const data = await res.json();
      setStatus(data.participant.paymentStatus);
      setAmountPaidCents(data.participant.amountPaidCents);
      setSubmittedAt(data.participant.paymentSubmittedAt);
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function undoPaid() {
    setError(null);
    setIsSaving(true);
    try {
      const res = await fetch(
        `/api/sessions/${sessionCode}/participants/${participantId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentStatus: "unpaid" }),
        },
      );
      if (!res.ok) throw new Error("Could not update payment status");
      const data = await res.json();
      setStatus(data.participant.paymentStatus);
      setAmountPaidCents(0);
      setSubmittedAt(null);
      setConfirmedAt(null);
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleProofUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setIsSaving(true);
    try {
      const resized = await resizeImageForUpload(file);
      const formData = new FormData();
      formData.append("proof", resized, "proof.jpg");
      const res = await fetch(
        `/api/sessions/${sessionCode}/participants/${participantId}/payment-proof`,
        { method: "POST", body: formData },
      );
      if (!res.ok) throw new Error("Could not upload payment proof");
      const data = await res.json();
      setStatus(data.participant.paymentStatus);
      setProofUrl(data.participant.paymentProofUrl);
    } catch {
      setError("Couldn't upload that image — please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  function copyAmount() {
    navigator.clipboard.writeText(formatCents(amountCents, currency)).then(() => {
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2000);
    });
  }

  function copyNumber() {
    if (!gcashNumber) return;
    navigator.clipboard.writeText(gcashNumber).then(() => {
      setCopiedNumber(true);
      setTimeout(() => setCopiedNumber(false), 2000);
    });
  }

  function copyNote() {
    navigator.clipboard
      .writeText(`${billName} — ${formatCents(amountCents, currency)}`)
      .then(() => {
        setCopiedNote(true);
        setTimeout(() => setCopiedNote(false), 2000);
      });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="card p-4">
        <p className="mb-2 text-sm text-muted">How are you paying?</p>
        <div className="flex rounded-xl border border-border bg-bg p-1">
          {(Object.keys(METHOD_LABELS) as PaymentMethod[]).map((value) => (
            <button
              key={value}
              type="button"
              disabled={status !== "unpaid"}
              onClick={() => setMethod(value)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition disabled:opacity-60 ${
                method === value ? "bg-accent text-accent-foreground" : "text-muted"
              }`}
            >
              {METHOD_LABELS[value]}
            </button>
          ))}
        </div>
      </div>

      {method === "gcash" && gcashNumber ? (
        <div className="card p-4">
          <p className="text-sm text-muted">Send payment via GCash</p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="font-medium text-text">{gcashNumber}</p>
            <div className="flex shrink-0 gap-3">
              <button
                type="button"
                onClick={copyNumber}
                className="text-sm font-medium text-accent"
              >
                {copiedNumber ? "Copied!" : "Copy number"}
              </button>
              <button
                type="button"
                onClick={copyAmount}
                className="text-sm font-medium text-accent"
              >
                {copiedAmount ? "Copied!" : "Copy amount"}
              </button>
            </div>
          </div>

          {gcashQrUrl ? (
            qrRevealed ? (
              // eslint-disable-next-line @next/next/no-img-element -- remote Supabase Storage URL, not a static asset
              <img
                src={gcashQrUrl}
                alt="GCash QR code"
                className="mx-auto mt-3 h-48 w-48 rounded-xl border border-border object-contain"
              />
            ) : (
              <button
                type="button"
                onClick={() => setQrRevealed(true)}
                className="mt-3 w-full rounded-xl border border-dashed border-border py-3 text-sm font-medium text-accent"
              >
                Tap to reveal payment QR
              </button>
            )
          ) : null}

          <button
            type="button"
            onClick={copyNote}
            className="mt-3 w-full rounded-xl border border-border py-2 text-sm font-medium text-accent"
          >
            {copiedNote ? "Copied!" : "Copy note for payment"}
          </button>
        </div>
      ) : null}

      <div className="card p-4">
        {status === "confirmed" ? (
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-sm font-medium text-accent">✓ Payment confirmed</p>
            <p className="text-xs text-muted">via {METHOD_LABELS[method]}</p>
            {confirmedAt ? (
              <p className="text-xs text-muted">Confirmed {formatTimestamp(confirmedAt)}</p>
            ) : null}
            {reference ? <p className="text-xs text-muted">Ref: {reference}</p> : null}
            {note ? <p className="text-xs italic text-muted">&quot;{note}&quot;</p> : null}
            {remainingCents > 0 ? (
              <p className="mt-1 text-sm font-medium text-amber">
                {formatCents(remainingCents, currency)} still remaining
              </p>
            ) : null}
          </div>
        ) : status === "submitted" ? (
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="text-sm font-medium text-text">
              Payment sent — waiting for confirmation
            </p>
            <p className="text-xs text-muted">via {METHOD_LABELS[method]}</p>
            {submittedAt ? (
              <p className="text-xs text-muted">Sent {formatTimestamp(submittedAt)}</p>
            ) : null}
            {reference ? <p className="text-xs text-muted">Ref: {reference}</p> : null}
            {note ? <p className="text-xs italic text-muted">&quot;{note}&quot;</p> : null}
            {remainingCents > 0 ? (
              <p className="text-sm font-medium text-amber">
                {formatCents(remainingCents, currency)} still remaining
              </p>
            ) : null}
            {proofUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- remote Supabase Storage URL, not a static asset
              <img
                src={proofUrl}
                alt="Payment proof"
                className="h-24 w-24 rounded-xl border border-border object-cover"
              />
            ) : null}
            <button
              type="button"
              disabled={isSaving}
              onClick={undoPaid}
              className="text-sm text-muted disabled:opacity-60"
            >
              Undo
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={markPaid}
              className="btn-primary px-4 py-2 font-medium disabled:opacity-60"
            >
              I&apos;ve Paid
            </button>

            {!showDetails ? (
              <button
                type="button"
                onClick={() => setShowDetails(true)}
                className="text-center text-sm font-medium text-accent"
              >
                + Add reference number, note, or partial amount
              </button>
            ) : (
              <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Reference number (optional)"
                  className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
                />
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder='Note, e.g. "Paid via Maya" (optional)'
                  className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
                />
                <label className="flex items-center gap-2 text-sm text-muted">
                  <input
                    type="checkbox"
                    checked={payingCustomAmount}
                    onChange={(e) => setPayingCustomAmount(e.target.checked)}
                    className="h-4 w-4 accent-accent"
                  />
                  I&apos;m paying a different amount
                </label>
                {payingCustomAmount ? (
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
                  />
                ) : null}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleProofUpload}
              className="hidden"
            />
            <button
              type="button"
              disabled={isSaving}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl border border-border py-2 text-sm font-medium text-accent disabled:opacity-60"
            >
              Upload payment proof
            </button>
          </div>
        )}
        {error ? <p className="mt-2 text-center text-sm text-amber">{error}</p> : null}
      </div>
    </div>
  );
}
