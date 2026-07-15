import QRCode from "qrcode";
import { CopyLinkButton } from "@/components/CopyLinkButton";

export async function QRCodeCard({ url }: { url: string }) {
  const qrDataUrl = await QRCode.toDataURL(url, {
    margin: 1,
    width: 320,
    color: { dark: "#292620", light: "#FFFFFFFF" },
  });

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <p className="mb-1 font-medium text-text">Share this bill</p>
      <p className="mb-4 text-sm text-muted">
        Ask your friends to scan or open the link to join and claim their items.
      </p>
      <div className="flex justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- generated data URL, not an optimizable asset */}
        <img
          src={qrDataUrl}
          alt="QR code to join this bill"
          width={224}
          height={224}
          className="h-56 w-56"
        />
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-border bg-bg px-3 py-2">
        <span className="truncate text-sm text-muted">{url}</span>
        <CopyLinkButton text={url} />
      </div>
    </div>
  );
}
