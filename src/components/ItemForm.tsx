"use client";

import { useRef, useState } from "react";
import { getCurrencySymbol } from "@/lib/format";
import { autoCapitalize } from "@/lib/items/formatItemName";
import { useUnsavedChangesWarning } from "@/lib/hooks/useUnsavedChangesWarning";
import type { RecentItem } from "@/lib/session/recentItems";

export interface ItemFormValues {
  name: string;
  quantity: number;
  priceAmount: string;
}

const EMPTY_VALUES: ItemFormValues = { name: "", quantity: 1, priceAmount: "" };

export function ItemForm({
  initial,
  submitLabel,
  currency = "PHP",
  onSubmit,
  onCancel,
  onDelete,
  onSplit,
  isSplitting = false,
  resetAfterSubmit = false,
  suggestions,
}: {
  initial: ItemFormValues;
  submitLabel: string;
  currency?: string;
  onSubmit: (values: ItemFormValues) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
  onSplit?: () => Promise<void>;
  isSplitting?: boolean;
  // Keeps the form open and clears it after each successful submit instead of
  // closing — lets someone add several items back-to-back without re-tapping
  // "Add item" every time.
  resetAfterSubmit?: boolean;
  suggestions?: RecentItem[];
}) {
  const [name, setName] = useState(initial.name);
  const [quantity, setQuantity] = useState(String(initial.quantity));
  const [priceAmount, setPriceAmount] = useState(initial.priceAmount);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useUnsavedChangesWarning(
    name !== initial.name ||
      quantity !== String(initial.quantity) ||
      priceAmount !== initial.priceAmount,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        name: autoCapitalize(name),
        quantity: Number(quantity) || 1,
        priceAmount,
      });
      if (resetAfterSubmit) {
        setName(EMPTY_VALUES.name);
        setQuantity(String(EMPTY_VALUES.quantity));
        setPriceAmount(EMPTY_VALUES.priceAmount);
        nameInputRef.current?.focus();
      }
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    // No confirm dialog — deletion is instant and reversible via the Undo
    // toast it triggers, so a blocking "are you sure?" would be redundant.
    setIsSubmitting(true);
    try {
      await onDelete();
    } catch {
      setError("Could not delete — please try again.");
      setIsSubmitting(false);
    }
  }

  function stepQuantity(delta: number) {
    const next = Math.max(1, (Number(quantity) || 1) + delta);
    setQuantity(String(next));
  }

  function applySuggestion(suggestion: RecentItem) {
    setName(suggestion.name);
    setPriceAmount((suggestion.unitPriceCents / 100).toFixed(2));
  }

  function formatPriceOnBlur() {
    const n = Number(priceAmount);
    if (priceAmount.trim() !== "" && Number.isFinite(n)) {
      setPriceAmount(n.toFixed(2));
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 card p-4"
    >
      {suggestions && suggestions.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.name}
              type="button"
              onClick={() => applySuggestion(suggestion)}
              className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted"
            >
              {suggestion.name}
            </button>
          ))}
        </div>
      ) : null}

      <div>
        <label className="mb-1 block text-sm text-muted" htmlFor="item-name">
          Item name
        </label>
        <input
          id="item-name"
          ref={nameInputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Margherita Pizza"
          required
          className="w-full scroll-mb-32 rounded-xl border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
        />
      </div>
      <div className="flex gap-3">
        <div className="w-28">
          <label className="mb-1 block text-sm text-muted" htmlFor="item-qty">
            Qty
          </label>
          <div className="flex items-center rounded-xl border border-border bg-bg">
            <button
              type="button"
              onClick={() => stepQuantity(-1)}
              aria-label="Decrease quantity"
              className="flex h-9 w-9 shrink-0 items-center justify-center text-lg text-muted"
            >
              −
            </button>
            <input
              id="item-qty"
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full bg-transparent text-center text-text outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => stepQuantity(1)}
              aria-label="Increase quantity"
              className="flex h-9 w-9 shrink-0 items-center justify-center text-lg text-muted"
            >
              +
            </button>
          </div>
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-sm text-muted" htmlFor="item-price">
            Price each
          </label>
          <div className="flex items-center rounded-xl border border-border bg-bg pl-3 focus-within:border-accent">
            <span className="text-muted">{getCurrencySymbol(currency)}</span>
            <input
              id="item-price"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={priceAmount}
              onChange={(e) => setPriceAmount(e.target.value)}
              onBlur={formatPriceOnBlur}
              placeholder="0.00"
              required
              className="w-full bg-transparent px-2 py-2 text-text outline-none"
            />
          </div>
        </div>
      </div>

      {error ? <p className="text-sm text-amber">{error}</p> : null}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 btn-primary px-4 py-2 font-medium disabled:opacity-60"
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-xl border border-border px-4 py-2 font-medium text-text"
        >
          {resetAfterSubmit ? "Done" : "Cancel"}
        </button>
        {onDelete ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isSubmitting}
            className="rounded-xl px-3 py-2 text-amber"
            aria-label="Delete item"
          >
            <TrashIcon />
          </button>
        ) : null}
      </div>

      {onSplit ? (
        <button
          type="button"
          onClick={onSplit}
          disabled={isSubmitting || isSplitting}
          className="text-center text-sm font-medium text-accent disabled:opacity-60"
        >
          {isSplitting ? "Splitting…" : "Split into two items"}
        </button>
      ) : null}
    </form>
  );
}

function TrashIcon() {
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
    >
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" />
    </svg>
  );
}
