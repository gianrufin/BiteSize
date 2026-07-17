"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getDeviceSettings } from "@/lib/session/settings";
import { resizeImageForUpload } from "@/lib/image/resizeForUpload";

type Status = "idle" | "scanning" | "creating";

async function createSession(): Promise<string> {
  const res = await fetch("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      gcashNumber: getDeviceSettings().defaultGcashNumber ?? undefined,
      gcashQrUrl: getDeviceSettings().defaultGcashQrUrl ?? undefined,
      splitMode: getDeviceSettings().lastSplitMode,
    }),
  });
  if (!res.ok) throw new Error("Could not start a new bill");
  const { code } = await res.json();
  return code;
}

export function NewBillButton() {
  const router = useRouter();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setStatus("scanning");

    try {
      const resized = await resizeImageForUpload(file);
      const code = await createSession();

      // AI scanning is additive, never a blocker — if nothing is extracted, the
      // payer just lands on an empty bill and adds items manually, same as always.
      const formData = new FormData();
      formData.append("image", resized, "receipt.jpg");
      const res = await fetch(`/api/sessions/${code}/receipt/scan`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Could not read that receipt");

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
  const statusLabel =
    status === "scanning"
      ? "Reading your receipt…"
      : status === "creating"
        ? "Starting your bill…"
        : null;

  return (
    <div>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelected}
        className="hidden"
      />
      <input
        ref={libraryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelected}
        className="hidden"
      />

      {statusLabel ? (
        <div className="flex w-full items-center gap-4 card px-4 py-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl icon-well text-accent">
            <ScanIcon />
          </div>
          <p className="font-medium text-text">{statusLabel}</p>
        </div>
      ) : (
        <div className="flex gap-3">
          <button
            onClick={() => cameraInputRef.current?.click()}
            disabled={isBusy}
            className="flex flex-1 flex-col items-center gap-2 card px-4 py-5 text-center transition hover:bg-surface-muted disabled:opacity-60"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl icon-well text-accent">
              <CameraIcon />
            </div>
            <p className="font-medium text-text">Take a photo</p>
          </button>
          <button
            onClick={() => libraryInputRef.current?.click()}
            disabled={isBusy}
            className="flex flex-1 flex-col items-center gap-2 card px-4 py-5 text-center transition hover:bg-surface-muted disabled:opacity-60"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl icon-well text-accent">
              <UploadIcon />
            </div>
            <p className="font-medium text-text">Upload a photo</p>
          </button>
        </div>
      )}

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

function CameraIcon() {
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
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

function UploadIcon() {
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
      <path d="M12 16V4M12 4 7 9M12 4l5 5" />
      <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
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
