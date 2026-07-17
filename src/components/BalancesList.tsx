"use client";

import { useState } from "react";
import { formatCents } from "@/lib/format";
import { Avatar } from "@/components/Avatar";
import type { PersonBalance } from "@/types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function BalancesList({ people }: { people: PersonBalance[] }) {
  const owing = people.filter((p) => p.netOwedCents > 0);
  const settled = people.filter((p) => p.netOwedCents <= 0);

  return (
    <div className="flex flex-col gap-6">
      {owing.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted">Still owe you</h2>
          {owing.map((person) => (
            <PersonRow key={`${person.name}|${person.currency}`} person={person} />
          ))}
        </div>
      ) : null}

      {settled.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted">All settled</h2>
          {settled.map((person) => (
            <PersonRow key={`${person.name}|${person.currency}`} person={person} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PersonRow({ person }: { person: PersonBalance }) {
  const [status, setStatus] = useState<"idle" | "sent" | "copied">("idle");
  const isSettled = person.netOwedCents <= 0;

  async function handleRemind() {
    const amount = formatCents(person.netOwedCents, person.currency);
    const link = person.lastUnpaidSessionCode
      ? `${window.location.origin}/s/${person.lastUnpaidSessionCode}/summary`
      : null;
    const message = `Hey ${person.name}, friendly reminder — you owe ${amount} total across our recent bills.${
      link ? ` ${link}` : ""
    }`;

    if (navigator.share) {
      try {
        await navigator.share({ text: message });
        setStatus("sent");
        setTimeout(() => setStatus("idle"), 2000);
        return;
      } catch {
        // User backed out of the share sheet, or it's unsupported — fall back
        // to copying the message instead of leaving the tap a dead end.
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
    <div className="card flex items-center gap-3 p-4">
      <Avatar id={person.name} name={person.name} size={40} />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-text">{person.name}</p>
        <p className="text-xs text-muted">
          {person.billCount} {person.billCount === 1 ? "bill" : "bills"} · last{" "}
          {formatDate(person.lastBillAt)}
          {person.unsettledBillCount > 0
            ? ` · ${person.unsettledBillCount} unpaid`
            : ""}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className={`font-semibold ${isSettled ? "text-muted" : "text-text"}`}>
          {isSettled ? "Settled" : formatCents(person.netOwedCents, person.currency)}
        </p>
        {!isSettled ? (
          <button
            type="button"
            onClick={handleRemind}
            className="text-xs font-medium text-accent"
          >
            {status === "sent" ? "Sent!" : status === "copied" ? "Copied!" : "Remind"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
