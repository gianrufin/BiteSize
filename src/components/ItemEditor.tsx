"use client";

import { useState } from "react";
import { formatCents } from "@/lib/format";
import { findDuplicateItems } from "@/lib/items/findDuplicateItems";
import { ItemForm, type ItemFormValues } from "@/components/ItemForm";
import { ItemRow } from "@/components/ItemRow";
import { TrackRecentBill } from "@/components/TrackRecentBill";
import type { Item } from "@/types";

function pairKey(idA: string, idB: string): string {
  return [idA, idB].sort().join(":");
}

export interface EditableSessionSummary {
  code: string;
  name: string | null;
  currency: string;
  subtotalCents: number;
  grandTotalCents: number;
}

export function ItemEditor({
  session: initialSession,
  items: initialItems,
  isLocked = false,
}: {
  session: EditableSessionSummary;
  items: Item[];
  isLocked?: boolean;
}) {
  const [session, setSession] = useState(initialSession);
  const [items, setItems] = useState(initialItems);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [dismissedPairs, setDismissedPairs] = useState<Set<string>>(new Set());
  const [mergingPairKey, setMergingPairKey] = useState<string | null>(null);

  const duplicatePairs = findDuplicateItems(items).filter(
    (pair) => !dismissedPairs.has(pairKey(pair.a.id, pair.b.id)),
  );

  async function addItem(values: ItemFormValues) {
    const res = await fetch(`/api/sessions/${session.code}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: values.name,
        quantity: values.quantity,
        unitPriceCents: Math.round(Number(values.priceAmount) * 100),
      }),
    });
    if (!res.ok) throw new Error("Could not add item");
    const { item, session: updatedSession } = await res.json();
    setItems((prev) => [...prev, item]);
    setSession(updatedSession);
    setIsAdding(false);
  }

  async function updateItem(itemId: string, values: ItemFormValues) {
    const res = await fetch(`/api/sessions/${session.code}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: values.name,
        quantity: values.quantity,
        unitPriceCents: Math.round(Number(values.priceAmount) * 100),
      }),
    });
    if (!res.ok) throw new Error("Could not update item");
    const { item, session: updatedSession } = await res.json();
    setItems((prev) => prev.map((existing) => (existing.id === item.id ? item : existing)));
    setSession(updatedSession);
    setEditingItemId(null);
  }

  async function deleteItem(itemId: string) {
    const res = await fetch(`/api/sessions/${session.code}/items/${itemId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Could not delete item");
    const { session: updatedSession } = await res.json();
    setItems((prev) => prev.filter((existing) => existing.id !== itemId));
    setSession(updatedSession);
    setEditingItemId(null);
  }

  async function mergeItems(keep: Item, remove: Item) {
    const key = pairKey(keep.id, remove.id);
    setMergingPairKey(key);
    try {
      const mergedQuantity = keep.quantity + remove.quantity;
      const mergedTotalCents = keep.totalPriceCents + remove.totalPriceCents;
      const mergedUnitPriceCents = Math.round(mergedTotalCents / mergedQuantity);

      const patchRes = await fetch(`/api/sessions/${session.code}/items/${keep.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: mergedQuantity,
          unitPriceCents: mergedUnitPriceCents,
        }),
      });
      if (!patchRes.ok) throw new Error("Could not merge items");
      const { item: mergedItem } = await patchRes.json();

      const deleteRes = await fetch(
        `/api/sessions/${session.code}/items/${remove.id}`,
        { method: "DELETE" },
      );
      if (!deleteRes.ok) throw new Error("Could not merge items");
      const { session: updatedSession } = await deleteRes.json();

      setItems((prev) =>
        prev
          .filter((existing) => existing.id !== remove.id)
          .map((existing) => (existing.id === mergedItem.id ? mergedItem : existing)),
      );
      setSession(updatedSession);
    } catch {
      // Best-effort — the suggestion banner just stays up so they can retry.
    } finally {
      setMergingPairKey(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <TrackRecentBill
        code={session.code}
        name={session.name ?? "New bill"}
        totalCents={session.grandTotalCents}
        currency={session.currency}
        role="payer"
      />
      <div className="card p-4">
        {isLocked ? (
          <p className="mb-1 text-xs font-medium text-amber">🔒 This bill is locked</p>
        ) : null}
        <p className="text-sm text-muted">
          Items {items.length} · Subtotal{" "}
          {formatCents(session.subtotalCents, session.currency)}
        </p>
        <p className="text-2xl font-semibold text-text">
          {formatCents(session.grandTotalCents, session.currency)}
        </p>
      </div>

      {!isLocked && duplicatePairs.length > 0
        ? duplicatePairs.map((pair) => {
            const key = pairKey(pair.a.id, pair.b.id);
            const isMerging = mergingPairKey === key;
            return (
              <div
                key={key}
                className="flex items-center justify-between gap-3 rounded-2xl border border-amber/40 bg-surface p-4"
              >
                <p className="text-sm text-text">
                  <span className="font-medium">{pair.a.name}</span> and{" "}
                  <span className="font-medium">{pair.b.name}</span> look like the
                  same item — merge them?
                </p>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    disabled={isMerging}
                    onClick={() => setDismissedPairs((prev) => new Set(prev).add(key))}
                    className="rounded-lg px-2 py-1 text-sm font-medium text-muted disabled:opacity-60"
                  >
                    Dismiss
                  </button>
                  <button
                    type="button"
                    disabled={isMerging}
                    onClick={() => mergeItems(pair.a, pair.b)}
                    className="rounded-lg px-2 py-1 text-sm font-medium text-accent disabled:opacity-60"
                  >
                    {isMerging ? "Merging…" : "Merge"}
                  </button>
                </div>
              </div>
            );
          })
        : null}

      {items.length === 0 && !isAdding ? (
        <div className="rounded-2xl border border-dashed border-border py-8 text-center">
          <p className="font-medium text-text">No items yet</p>
          <p className="mt-1 text-sm text-muted">
            Add what was ordered below to start splitting the bill.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) =>
            editingItemId === item.id ? (
              <ItemForm
                key={item.id}
                submitLabel="Save"
                initial={{
                  name: item.name,
                  quantity: item.quantity,
                  priceAmount: (item.unitPriceCents / 100).toFixed(2),
                }}
                currency={session.currency}
                onSubmit={(values) => updateItem(item.id, values)}
                onCancel={() => setEditingItemId(null)}
                onDelete={() => deleteItem(item.id)}
              />
            ) : (
              <ItemRow
                key={item.id}
                item={item}
                currency={session.currency}
                onEdit={() => setEditingItemId(item.id)}
                readOnly={isLocked}
              />
            ),
          )}
        </div>
      )}

      {isLocked ? null : isAdding ? (
        <ItemForm
          submitLabel="Add item"
          initial={{ name: "", quantity: 1, priceAmount: "" }}
          currency={session.currency}
          onSubmit={addItem}
          onCancel={() => setIsAdding(false)}
        />
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="rounded-2xl border border-dashed border-border py-3 text-center font-medium text-accent"
        >
          + Add Item Manually
        </button>
      )}
    </div>
  );
}
