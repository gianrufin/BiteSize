"use client";

import { useState } from "react";
import { formatCents } from "@/lib/format";

export interface UnpaidParticipant {
  id: string;
  name: string;
  amountCents: number;
}

export function PaymentReminder({
  billName,
  sessionCode,
  currency,
  gcashNumber,
  participants,
}: {
  billName: string;
  sessionCode: string;
  currency: string;
  gcashNumber: string | null;
  participants: UnpaidParticipant[];
}) {
  if (participants.length === 0) return null;

  return (
    <div className="card p-4">
      <p className="mb-2 text-sm font-medium text-muted">
        {participants.length} {participants.length === 1 ? "person hasn't" : "people haven't"} paid
        yet
      </p>
      <div className="flex flex-col gap-2">
        {participants.map((participant) => (
          <ReminderRow
            key={participant.id}
            billName={billName}
            sessionCode={sessionCode}
            currency={currency}
            gcashNumber={gcashNumber}
            {...participant}
          />
        ))}
      </div>
    </div>
  );
}

function ReminderRow({
  name,
  amountCents,
  billName,
  sessionCode,
  currency,
  gcashNumber,
}: UnpaidParticipant & {
  billName: string;
  sessionCode: string;
  currency: string;
  gcashNumber: string | null;
}) {
  const [status, setStatus] = useState<"idle" | "sent" | "copied">("idle");

  async function handleRemind() {
    const summaryUrl = `${window.location.origin}/s/${sessionCode}/summary`;
    const amount = formatCents(amountCents, currency);
    const message = `Hey ${name}, just a reminder — you owe ${amount} for "${billName}"${
      gcashNumber ? ` (GCash: ${gcashNumber})` : ""
    }. ${summaryUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({ text: message });
        setStatus("sent");
        setTimeout(() => setStatus("idle"), 2000);
        return;
      } catch {
        // User backed out of the share sheet, or it's unsupported here — fall
        // back to copying the message instead of leaving the tap a dead end.
      }
    }

    try {
      await navigator.clipboard.writeText(message);
      setStatus("copied");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      // Clipboard API unavailable — nothing further to fall back to.
    }
  }

  return (
    <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
      <div>
        <p className="text-sm text-text">{name}</p>
        <p className="text-xs text-muted">{formatCents(amountCents, currency)} owed</p>
      </div>
      <button
        type="button"
        onClick={handleRemind}
        className="rounded-lg px-2 py-1 text-sm font-medium text-accent"
      >
        {status === "sent" ? "Sent!" : status === "copied" ? "Copied!" : "Remind"}
      </button>
    </div>
  );
}
