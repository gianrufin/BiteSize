"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDeviceSettings, setDefaultGcashNumber } from "@/lib/session/settings";
import { isValidGcashNumber } from "@/lib/validation/gcash";
import { AppHeader } from "@/components/AppHeader";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function SettingsPage() {
  const [gcashNumber, setGcashNumber] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // localStorage isn't available during SSR — this sync-on-mount is the
    // external-system case the lint rule means to exempt.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGcashNumber(getDeviceSettings().defaultGcashNumber ?? "");
  }, []);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const trimmed = gcashNumber.trim();
    if (trimmed && !isValidGcashNumber(trimmed)) {
      setError("Enter an 11-digit GCash mobile number, e.g. 09171234567");
      return;
    }

    setDefaultGcashNumber(trimmed || null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-24 pt-12">
      <AppHeader
        right={
          <Link href="/" className="text-sm font-medium text-accent">
            ← Back
          </Link>
        }
      />
      <h1 className="mt-6 text-2xl font-semibold text-text">Settings</h1>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium text-muted">Payment</h2>
        <form
          onSubmit={handleSave}
          className="flex flex-col gap-2 card p-4"
        >
          <label className="text-sm text-muted" htmlFor="default-gcash">
            Your GCash number
          </label>
          <p className="text-xs text-muted">
            Used to prefill new bills you create, so friends know where to send
            payment without asking. You can still change it per bill.
          </p>
          <input
            id="default-gcash"
            value={gcashNumber}
            onChange={(e) => setGcashNumber(e.target.value)}
            placeholder="09171234567"
            inputMode="numeric"
            className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
          />
          {error ? <p className="text-sm text-amber">{error}</p> : null}
          <button
            type="submit"
            className="mt-1 btn-primary px-4 py-2 font-medium"
          >
            {saved ? "Saved!" : "Save"}
          </button>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium text-muted">Appearance</h2>
        <ThemeToggle />
      </section>
    </main>
  );
}
