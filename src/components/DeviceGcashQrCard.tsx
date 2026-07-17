"use client";

import { useEffect, useRef, useState } from "react";
import { resizeImageForUpload } from "@/lib/image/resizeForUpload";
import { autoCropQrCode } from "@/lib/image/cropQrCode";
import { getDeviceSettings, setDefaultGcashQrUrl } from "@/lib/session/settings";

export function DeviceGcashQrCard() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    // localStorage isn't available during SSR — this sync-on-mount is the
    // external-system case the lint rule means to exempt.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQrUrl(getDeviceSettings().defaultGcashQrUrl);
  }, []);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setNote(null);
    setIsUploading(true);
    try {
      const { blob, cropped } = await autoCropQrCode(file);
      const upload = cropped ? blob : await resizeImageForUpload(file);
      setNote(
        cropped
          ? "Cropped to just the QR code."
          : "Couldn't find a QR code in that image — uploaded as-is.",
      );

      const formData = new FormData();
      formData.append("qr", upload, "qr.jpg");
      const res = await fetch("/api/device/gcash-qr", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Could not upload the QR code");
      const data = await res.json();
      setQrUrl(data.qrUrl);
      setDefaultGcashQrUrl(data.qrUrl);
    } catch {
      setNote(null);
      setError("Couldn't upload that image — please try again.");
    } finally {
      setIsUploading(false);
    }
  }

  function handleRemove() {
    setQrUrl(null);
    setDefaultGcashQrUrl(null);
    setNote(null);
    setError(null);
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
            alt="Your default GCash QR code"
            className="h-14 w-14 shrink-0 rounded-lg border border-border object-contain"
          />
        ) : null}
        <div className="flex-1">
          <p className="text-sm text-muted">Your GCash QR code</p>
          <p className="text-xs text-muted">
            Prefills new bills so you don&apos;t have to re-upload it each time. You
            can still change it per bill.
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
      {qrUrl && !isUploading ? (
        <button
          type="button"
          onClick={handleRemove}
          className="mt-2 text-sm font-medium text-muted"
        >
          Remove
        </button>
      ) : null}
      {note ? <p className="mt-2 text-sm text-muted">{note}</p> : null}
      {error ? <p className="mt-2 text-sm text-amber">{error}</p> : null}
    </div>
  );
}
