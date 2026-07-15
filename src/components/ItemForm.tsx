"use client";

import { useState } from "react";

export interface ItemFormValues {
  name: string;
  quantity: number;
  priceAmount: string;
}

export function ItemForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  onDelete,
}: {
  initial: ItemFormValues;
  submitLabel: string;
  onSubmit: (values: ItemFormValues) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
}) {
  const [name, setName] = useState(initial.name);
  const [quantity, setQuantity] = useState(String(initial.quantity));
  const [priceAmount, setPriceAmount] = useState(initial.priceAmount);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        name,
        quantity: Number(quantity) || 1,
        priceAmount,
      });
    } catch {
      setError("Something went wrong — please try again.");
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    setIsSubmitting(true);
    try {
      await onDelete();
    } catch {
      setError("Could not delete — please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4"
    >
      <div>
        <label className="mb-1 block text-sm text-muted" htmlFor="item-name">
          Item name
        </label>
        <input
          id="item-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Margherita Pizza"
          required
          className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
        />
      </div>
      <div className="flex gap-3">
        <div className="w-20">
          <label className="mb-1 block text-sm text-muted" htmlFor="item-qty">
            Qty
          </label>
          <input
            id="item-qty"
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-sm text-muted" htmlFor="item-price">
            Price each
          </label>
          <div className="flex items-center rounded-xl border border-border bg-bg pl-3 focus-within:border-accent">
            <span className="text-muted">₱</span>
            <input
              id="item-price"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={priceAmount}
              onChange={(e) => setPriceAmount(e.target.value)}
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
          className="flex-1 rounded-xl bg-accent px-4 py-2 font-medium text-accent-foreground transition disabled:opacity-60"
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-xl border border-border px-4 py-2 font-medium text-text"
        >
          Cancel
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
