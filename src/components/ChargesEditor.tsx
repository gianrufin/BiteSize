"use client";

import { useState } from "react";
import type { Session } from "@/types";

export interface ChargesValue {
  taxCents: number;
  serviceChargeCents: number;
  tipCents: number;
  discountCents: number;
}

function centsToInput(cents: number): string {
  return cents === 0 ? "" : (cents / 100).toFixed(2);
}

function inputToCents(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
}

export function ChargesEditor({
  sessionCode,
  initialCharges,
  onSessionUpdate,
}: {
  sessionCode: string;
  initialCharges: ChargesValue;
  onSessionUpdate: (session: Session) => void;
}) {
  const [tax, setTax] = useState(centsToInput(initialCharges.taxCents));
  const [serviceCharge, setServiceCharge] = useState(
    centsToInput(initialCharges.serviceChargeCents),
  );
  const [tip, setTip] = useState(centsToInput(initialCharges.tipCents));
  const [discount, setDiscount] = useState(centsToInput(initialCharges.discountCents));
  const [isExpanded, setIsExpanded] = useState(
    Object.values(initialCharges).some((cents) => cents > 0),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const res = await fetch(`/api/sessions/${sessionCode}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taxCents: inputToCents(tax),
          serviceChargeCents: inputToCents(serviceCharge),
          tipCents: inputToCents(tip),
          discountCents: inputToCents(discount),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not save charges");
      onSessionUpdate(data.session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSaving(false);
    }
  }

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full rounded-2xl border border-dashed border-border py-3 text-center text-sm font-medium text-accent"
      >
        + Add tax, service charge, tip, or discount
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSave}
      className="flex flex-col gap-3 card p-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <ChargeField label="Tax" value={tax} onChange={setTax} />
        <ChargeField label="Service charge" value={serviceCharge} onChange={setServiceCharge} />
        <ChargeField label="Tip" value={tip} onChange={setTip} />
        <ChargeField label="Discount" value={discount} onChange={setDiscount} />
      </div>

      {error ? <p className="text-sm text-amber">{error}</p> : null}

      <button
        type="submit"
        disabled={isSaving}
        className="btn-primary px-4 py-2 font-medium disabled:opacity-60"
      >
        {isSaving ? "Saving…" : "Save"}
      </button>
    </form>
  );
}

function ChargeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm text-muted">{label}</label>
      <div className="flex items-center rounded-xl border border-border bg-bg pl-3 focus-within:border-accent">
        <span className="text-muted">₱</span>
        <input
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0.00"
          className="w-full bg-transparent px-2 py-2 text-text outline-none"
        />
      </div>
    </div>
  );
}
