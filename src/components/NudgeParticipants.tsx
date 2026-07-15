"use client";

import { useState } from "react";
import type { ItemClaim, Participant } from "@/types";

export function NudgeParticipants({
  billName,
  sessionCode,
  participants,
  claims,
}: {
  billName: string;
  sessionCode: string;
  participants: Participant[];
  claims: ItemClaim[];
}) {
  const claimedParticipantIds = new Set(claims.map((c) => c.participantId));
  const unclaimedParticipants = participants.filter(
    (p) => !p.isPayer && !claimedParticipantIds.has(p.id),
  );

  if (unclaimedParticipants.length === 0) return null;

  return (
    <div className="card p-4">
      <p className="mb-2 text-sm font-medium text-muted">
        Waiting on {unclaimedParticipants.length}{" "}
        {unclaimedParticipants.length === 1 ? "person" : "people"} to claim their items
      </p>
      <div className="flex flex-col gap-2">
        {unclaimedParticipants.map((participant) => (
          <NudgeRow
            key={participant.id}
            name={participant.name}
            billName={billName}
            sessionCode={sessionCode}
          />
        ))}
      </div>
    </div>
  );
}

function NudgeRow({
  name,
  billName,
  sessionCode,
}: {
  name: string;
  billName: string;
  sessionCode: string;
}) {
  const [status, setStatus] = useState<"idle" | "sent" | "copied">("idle");

  async function handleNudge() {
    const joinUrl = `${window.location.origin}/s/${sessionCode}/join`;
    const message = `Hey ${name}, don't forget to claim what you ordered on "${billName}"! ${joinUrl}`;

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
      <span className="text-sm text-text">{name}</span>
      <button
        type="button"
        onClick={handleNudge}
        className="rounded-lg px-2 py-1 text-sm font-medium text-accent"
      >
        {status === "sent" ? "Sent!" : status === "copied" ? "Copied!" : "Nudge"}
      </button>
    </div>
  );
}
