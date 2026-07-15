"use client";

import { useState } from "react";
import { formatCents } from "@/lib/format";

export interface ExportParticipant {
  name: string;
  isPayer: boolean;
  amountCents: number;
}

export function ExportSummaryImage({
  billName,
  grandTotalCents,
  currency,
  participants,
}: {
  billName: string;
  grandTotalCents: number;
  currency: string;
  participants: ExportParticipant[];
}) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setError(null);
    setIsExporting(true);
    try {
      const blob = await renderSummaryImage({
        billName,
        grandTotalCents,
        currency,
        participants,
      });
      const fileName = `${billName.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "bill"}.png`;
      const file = new File([blob], fileName, { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: billName });
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      // User backing out of the share sheet throws an AbortError — not a failure.
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError("Could not create the image — please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleExport}
        disabled={isExporting}
        className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-accent disabled:opacity-60"
      >
        {isExporting ? "Preparing…" : "Save as Image"}
      </button>
      {error ? <p className="mt-1 text-xs text-amber">{error}</p> : null}
    </div>
  );
}

const COLORS = {
  bg: "#F7F5EF",
  text: "#292620",
  muted: "#8B887E",
  border: "#ECE7DB",
  accent: "#7C9066",
};

async function renderSummaryImage({
  billName,
  grandTotalCents,
  currency,
  participants,
}: {
  billName: string;
  grandTotalCents: number;
  currency: string;
  participants: ExportParticipant[];
}): Promise<Blob> {
  const width = 720;
  const rowHeight = 64;
  const headerHeight = 220;
  const footerHeight = 60;
  const height = headerHeight + Math.max(participants.length, 1) * rowHeight + footerHeight;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser");

  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = COLORS.text;
  ctx.font = "600 22px system-ui, sans-serif";
  ctx.fillText("BiteSize", 40, 56);

  ctx.font = "700 32px system-ui, sans-serif";
  ctx.fillText(billName, 40, 104);

  ctx.fillStyle = COLORS.muted;
  ctx.font = "500 16px system-ui, sans-serif";
  ctx.fillText(
    new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    40,
    130,
  );

  ctx.fillStyle = COLORS.muted;
  ctx.font = "500 16px system-ui, sans-serif";
  ctx.fillText("Total bill", 40, 170);
  ctx.fillStyle = COLORS.text;
  ctx.font = "700 44px system-ui, sans-serif";
  ctx.fillText(formatCents(grandTotalCents, currency), 40, 214);

  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, headerHeight - 20);
  ctx.lineTo(width - 40, headerHeight - 20);
  ctx.stroke();

  let y = headerHeight + 20;
  for (const participant of participants) {
    ctx.fillStyle = COLORS.text;
    ctx.font = "600 20px system-ui, sans-serif";
    ctx.fillText(
      participant.isPayer ? `${participant.name} (Payer)` : participant.name,
      40,
      y,
    );

    ctx.fillStyle = participant.isPayer ? COLORS.accent : COLORS.text;
    ctx.font = "700 20px system-ui, sans-serif";
    const amountText = formatCents(participant.amountCents, currency);
    const textWidth = ctx.measureText(amountText).width;
    ctx.fillText(amountText, width - 40 - textWidth, y);

    y += rowHeight;
  }

  ctx.fillStyle = COLORS.muted;
  ctx.font = "400 14px system-ui, sans-serif";
  ctx.fillText("Split with BiteSize", 40, height - 24);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not render the summary image"));
    }, "image/png");
  });
}
