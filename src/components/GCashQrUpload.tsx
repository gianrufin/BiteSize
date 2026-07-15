"use client";

import { useRef, useState } from "react";
import { resizeImageForUpload } from "@/lib/image/resizeForUpload";

export function GCashQrUpload({
  sessionCode,
  initialGcashQrUrl,
}: {
  sessionCode: string;
  initialGcashQrUrl: string | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [qrUrl, setQrUrl] = useState(initialGcashQrUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setIsUploading(true);
    try {
      const resized = await resizeImageForUpload(file);
      const formData = new FormData();
      formData.append("qr", resized, "qr.jpg");
      const res = await fetch(`/api/sessions/${sessionCode}/gcash-qr`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Could not upload the QR code");
      const data = await res.json();
      setQrUrl(data.session.gcashQrUrl);
    } catch {
      setError("Couldn't upload that image — please try again.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="card p-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelected}
        className="hidden"
      />
      <div className="flex items-center gap-3">
        {qrUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote Supabase Storage URL, not a static asset
          <img
            src={qrUrl}
            alt="GCash QR code"
            className="h-14 w-14 shrink-0 rounded-lg border border-border object-contain"
          />
        ) : null}
        <div className="flex-1">
          <p className="text-sm text-muted">GCash QR code</p>
          <p className="text-xs text-muted">
            Let people scan to pay instead of typing your number.
          </p>
        </div>
        <button
          type="button"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          className="shrink-0 text-sm font-medium text-accent disabled:opacity-60"
        >
          {isUploading ? "Uploading…" : qrUrl ? "Replace" : "Upload"}
        </button>
      </div>
      {error ? <p className="mt-2 text-sm text-amber">{error}</p> : null}
    </div>
  );
}
