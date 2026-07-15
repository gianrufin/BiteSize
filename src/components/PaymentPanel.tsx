"use client";

import { useRef, useState } from "react";
import { formatCents } from "@/lib/format";
import { resizeImageForUpload } from "@/lib/image/resizeForUpload";
import type { PaymentStatus } from "@/types";

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
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState(initialPaymentStatus);
  const [proofUrl, setProofUrl] = useState(initialProofUrl);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [copiedNote, setCopiedNote] = useState(false);

  async function updateStatus(next: "unpaid" | "submitted") {
    setError(null);
    setIsSaving(true);
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
      const data = await res.json();
      setStatus(data.participant.paymentStatus);
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
      {gcashNumber ? (
        <div className="card p-4">
          <p className="text-sm text-muted">Send payment via GCash</p>
          <div className="mt-1 flex items-center justify-between">
            <p className="font-medium text-text">{gcashNumber}</p>
            <button
              type="button"
              onClick={copyAmount}
              className="shrink-0 text-sm font-medium text-accent"
            >
              {copiedAmount ? "Copied!" : "Copy amount"}
            </button>
          </div>

          {gcashQrUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote Supabase Storage URL, not a static asset
            <img
              src={gcashQrUrl}
              alt="GCash QR code"
              className="mx-auto mt-3 h-48 w-48 rounded-xl border border-border object-contain"
            />
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
          <p className="text-center text-sm font-medium text-accent">
            ✓ Payment confirmed
          </p>
        ) : status === "submitted" ? (
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="text-sm font-medium text-text">
              Payment sent — waiting for confirmation
            </p>
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
              onClick={() => updateStatus("unpaid")}
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
              onClick={() => updateStatus("submitted")}
              className="btn-primary px-4 py-2 font-medium disabled:opacity-60"
            >
              I&apos;ve Paid
            </button>
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
