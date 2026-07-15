"use client";

import { useState } from "react";

const COMMON_CURRENCIES = ["PHP", "USD", "EUR", "GBP", "JPY", "SGD", "AUD", "CAD"];

export function CurrencySelector({
  sessionCode,
  initialCurrency,
  disabled = false,
}: {
  sessionCode: string;
  initialCurrency: string;
  disabled?: boolean;
}) {
  const [currency, setCurrency] = useState(initialCurrency);
  const [isSaving, setIsSaving] = useState(false);

  async function handleChange(next: string) {
    if (next === currency) return;
    const previous = currency;
    setCurrency(next);
    setIsSaving(true);
    try {
      const res = await fetch(`/api/sessions/${sessionCode}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency: next }),
      });
      if (!res.ok) throw new Error("Could not update currency");
    } catch {
      setCurrency(previous);
    } finally {
      setIsSaving(false);
    }
  }

  const options = COMMON_CURRENCIES.includes(currency)
    ? COMMON_CURRENCIES
    : [currency, ...COMMON_CURRENCIES];

  return (
    <div className="flex items-center justify-between card px-4 py-3">
      <p className="text-sm text-muted">Currency</p>
      <select
        value={currency}
        disabled={disabled || isSaving}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-xl border border-border bg-bg px-2 py-1.5 text-sm font-medium text-text outline-none disabled:opacity-60"
      >
        {options.map((code) => (
          <option key={code} value={code}>
            {code}
          </option>
        ))}
      </select>
    </div>
  );
}
