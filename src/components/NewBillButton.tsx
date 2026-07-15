"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getDeviceSettings } from "@/lib/session/settings";
import { recognizeReceiptText } from "@/lib/ocr/tesseract";
import { parseReceiptItems } from "@/lib/ocr/parseReceiptText";

type Status = "idle" | "scanning" | "creating";

async function createSession(): Promise<string> {
  const res = await fetch("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      gcashNumber: getDeviceSettings().defaultGcashNumber ?? undefined,
    }),
  });
  if (!res.ok) throw new Error("Could not start a new bill");
  const { code } = await res.json();
  return code;
}

export function NewBillButton() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setStatus("scanning");
    setProgress(0);

    try {
      const text = await recognizeReceiptText(file, setProgress);
      const parsedItems = parseReceiptItems(text);

      setStatus("creating");
      const code = await createSession();

      // OCR is additive, never a blocker — if nothing parsed, the payer just
      // lands on an empty bill and adds items manually, same as always.
      await Promise.all(
        parsedItems.map((item) =>
          fetch(`/api/sessions/${code}/items`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: item.name,
              quantity: item.quantity,
              unitPriceCents: item.unitPriceCents,
              source: "ocr",
              ocrConfidence: item.confidence,
            }),
          }),
        ),
      );

      router.push(`/s/${code}`);
    } catch {
      setError("Couldn't read that receipt — you can still add items by hand.");
      setStatus("idle");
    }
  }

  async function handleStartBlank() {
    setError(null);
    setStatus("creating");
    try {
      const code = await createSession();
      router.push(`/s/${code}`);
    } catch {
      setError("Something went wrong — please try again.");
      setStatus("idle");
    }
  }

  const isBusy = status !== "idle";

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelected}
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isBusy}
        className="flex w-full items-center gap-4 rounded-2xl border border-border bg-surface px-4 py-4 text-left transition hover:bg-surface-muted disabled:opacity-60"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <ScanIcon />
        </div>
        <div className="flex-1">
          <p className="font-medium text-text">
            {status === "scanning"
              ? `Reading your receipt… ${progress}%`
              : status === "creating"
                ? "Starting your bill…"
                : "Scan a receipt"}
          </p>
          <p className="text-sm text-muted">Upload or take a photo</p>
        </div>
        <ChevronIcon />
      </button>

      {error ? <p className="mt-2 text-sm text-amber">{error}</p> : null}

      {!isBusy ? (
        <button
          onClick={handleStartBlank}
          className="mt-3 w-full text-center text-sm font-medium text-accent"
        >
          or start with a blank bill
        </button>
      ) : null}
    </div>
  );
}

function ScanIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 2h9a2 2 0 0 1 2 2v18l-3-2-2 2-2-2-2 2-2-2-3 2V7l3-3Z" />
      <path d="M9 8h6M9 12h6" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-muted"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
