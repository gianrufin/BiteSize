import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";

export const metadata = {
  title: "Buy me a coffee · BiteSize",
  description: "BiteSize is free. If it saved you from doing math after dinner, you can leave a tip.",
};

const SUGGESTIONS = [
  { emoji: "☕", label: "A coffee", amount: "₱50" },
  { emoji: "🍔", label: "A snack", amount: "₱100" },
  { emoji: "🍽️", label: "A meal", amount: "₱250" },
];

export default function SupportPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-24 pt-12">
      <AppHeader
        right={
          <Link href="/" className="text-sm font-medium text-accent">
            ← Back
          </Link>
        }
      />

      <div className="mt-8 flex flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl icon-well text-3xl">
          ☕
        </div>
        <h1 className="mt-4 text-2xl font-semibold text-text">Buy me a coffee</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          BiteSize is free and built by one person. If it saved you from doing
          long division after dinner, a small tip keeps it running — and keeps me
          caffeinated enough to build more. No pressure, ever. 💛
        </p>
      </div>

      <div className="mt-6 card-lg flex flex-col items-center p-6">
        {/* eslint-disable-next-line @next/next/no-img-element -- static QR asset in /public, no benefit from next/image's raster pipeline */}
        <img
          src="/support-qr.jpg"
          alt="InstaPay QR code to send a tip"
          className="h-60 w-60 rounded-xl border border-border object-contain"
        />
        <p className="mt-4 text-sm font-medium text-text">Scan to send a tip</p>
        <p className="mt-1 text-xs text-muted">
          Works with GCash, Maya, or any bank app via InstaPay
        </p>
        <a
          href="/support-qr.jpg"
          download="bitesize-tip-qr.jpg"
          className="mt-3 text-sm font-medium text-accent"
        >
          Save QR code
        </a>
      </div>

      <div className="mt-4 flex justify-center gap-2">
        {SUGGESTIONS.map((s) => (
          <div
            key={s.label}
            className="flex flex-1 flex-col items-center gap-0.5 rounded-2xl border border-border bg-surface-muted px-2 py-3 text-center"
          >
            <span className="text-xl">{s.emoji}</span>
            <span className="text-sm font-semibold text-text">{s.amount}</span>
            <span className="text-xs text-muted">{s.label}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-xs text-muted">
        Amounts are just ideas — send whatever feels right.
      </p>

      <p className="mt-8 rounded-2xl bg-accent-soft px-4 py-3 text-center text-sm text-accent">
        On your phone? Screenshot this, then upload it in your GCash or bank app
        to pay.
      </p>

      <p className="mt-6 text-center text-sm text-muted">
        Thank you for using BiteSize. 🧾
      </p>
    </main>
  );
}
