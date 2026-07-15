"use client";

import { useState } from "react";
import { formatCents } from "@/lib/format";
import { findDuplicateItems } from "@/lib/items/findDuplicateItems";
import { offlineFetch } from "@/lib/offline/offlineFetch";
import {
  cancelQueuedMutation,
  findQueuedMutationByMeta,
  updateQueuedMutation,
} from "@/lib/offline/mutationQueue";
import { ItemForm, type ItemFormValues } from "@/components/ItemForm";
import { ItemRow, LOW_CONFIDENCE_THRESHOLD } from "@/components/ItemRow";
import type { Item } from "@/types";

function pairKey(idA: string, idB: string): string {
  return [idA, idB].sort().join(":");
}

function isLocalId(id: string): boolean {
  return id.startsWith("local-");
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
  const [splittingItemId, setSplittingItemId] = useState<string | null>(null);

  const duplicatePairs = findDuplicateItems(items).filter(
    (pair) => !dismissedPairs.has(pairKey(pair.a.id, pair.b.id)),
  );

  const reviewCount = items.filter(
    (item) =>
      item.source === "ocr" &&
      item.ocrConfidence !== null &&
      item.ocrConfidence < LOW_CONFIDENCE_THRESHOLD,
  ).length;

  // Adjusts the two running totals the same way recomputeSessionTotals does
  // server-side (subtotal + charges, charges untouched by item edits) — used
  // whenever a mutation is queued offline and there's no server response to
  // read the real totals back from.
  function adjustTotalsBy(deltaCents: number) {
    setSession((prev) => ({
      ...prev,
      subtotalCents: prev.subtotalCents + deltaCents,
      grandTotalCents: prev.grandTotalCents + deltaCents,
    }));
  }

  async function addItem(values: ItemFormValues) {
    const unitPriceCents = Math.round(Number(values.priceAmount) * 100);
    const totalPriceCents = Math.round(values.quantity * unitPriceCents);
    const tempId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const result = await offlineFetch(
      `/api/sessions/${session.code}/items`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: values.name, quantity: values.quantity, unitPriceCents }),
      },
      { tempId },
    );

    if (result.status === "queued") {
      setItems((prev) => [
        ...prev,
        {
          id: tempId,
          sessionId: "",
          name: values.name,
          quantity: values.quantity,
          unitPriceCents,
          totalPriceCents,
          isShared: false,
          ocrConfidence: null,
          source: "manual",
          position: prev.length,
        },
      ]);
      adjustTotalsBy(totalPriceCents);
      setIsAdding(false);
      return;
    }

    if (!result.response.ok) throw new Error("Could not add item");
    const { item, session: updatedSession } = await result.response.json();
    setItems((prev) => [...prev, item]);
    setSession(updatedSession);
    setIsAdding(false);
  }

  async function updateItem(itemId: string, values: ItemFormValues) {
    const unitPriceCents = Math.round(Number(values.priceAmount) * 100);
    const totalPriceCents = Math.round(values.quantity * unitPriceCents);
    const existing = items.find((item) => item.id === itemId);
    const deltaCents = totalPriceCents - (existing?.totalPriceCents ?? 0);

    const applyLocally = () => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? { ...item, name: values.name, quantity: values.quantity, unitPriceCents, totalPriceCents, ocrConfidence: null }
            : item,
        ),
      );
      adjustTotalsBy(deltaCents);
      setEditingItemId(null);
    };

    // A still-unsynced item created offline has no real id yet — amend the
    // queued create in place instead of PATCHing an id the server has never
    // seen.
    if (isLocalId(itemId)) {
      const queued = findQueuedMutationByMeta("tempId", itemId);
      if (queued) {
        updateQueuedMutation(
          queued.id,
          JSON.stringify({ name: values.name, quantity: values.quantity, unitPriceCents }),
        );
      }
      applyLocally();
      return;
    }

    const result = await offlineFetch(`/api/sessions/${session.code}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: values.name, quantity: values.quantity, unitPriceCents }),
    });

    if (result.status === "queued") {
      applyLocally();
      return;
    }

    if (!result.response.ok) throw new Error("Could not update item");
    const { item, session: updatedSession } = await result.response.json();
    setItems((prev) => prev.map((existing) => (existing.id === item.id ? item : existing)));
    setSession(updatedSession);
    setEditingItemId(null);
  }

  async function deleteItem(itemId: string) {
    const existing = items.find((item) => item.id === itemId);
    const deltaCents = -(existing?.totalPriceCents ?? 0);

    const applyLocally = () => {
      setItems((prev) => prev.filter((item) => item.id !== itemId));
      adjustTotalsBy(deltaCents);
      setEditingItemId(null);
    };

    if (isLocalId(itemId)) {
      const queued = findQueuedMutationByMeta("tempId", itemId);
      if (queued) cancelQueuedMutation(queued.id);
      applyLocally();
      return;
    }

    const result = await offlineFetch(`/api/sessions/${session.code}/items/${itemId}`, {
      method: "DELETE",
    });

    if (result.status === "queued") {
      applyLocally();
      return;
    }

    if (!result.response.ok) throw new Error("Could not delete item");
    const { session: updatedSession } = await result.response.json();
    setItems((prev) => prev.filter((existing) => existing.id !== itemId));
    setSession(updatedSession);
    setEditingItemId(null);
  }

  // For an OCR line that actually merged two different items together. Keeps
  // the original item (renamed and re-priced to be "part 1") and adds a new
  // one for "part 2" — quantity 1 each, splitting the total so nothing is
  // lost, then hands editing straight to the new half so it can be renamed.
  async function splitItem(item: Item) {
    setSplittingItemId(item.id);
    try {
      const half1TotalCents = Math.ceil(item.totalPriceCents / 2);
      const half2TotalCents = item.totalPriceCents - half1TotalCents;

      const patchRes = await fetch(`/api/sessions/${session.code}/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: 1, unitPriceCents: half1TotalCents }),
      });
      if (!patchRes.ok) throw new Error("Could not split item");
      const { item: updatedFirstHalf } = await patchRes.json();

      const postRes = await fetch(`/api/sessions/${session.code}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: item.name,
          quantity: 1,
          unitPriceCents: half2TotalCents,
        }),
      });
      if (!postRes.ok) throw new Error("Could not split item");
      const { item: secondHalf, session: updatedSession } = await postRes.json();

      setItems((prev) => [
        ...prev.map((existing) => (existing.id === updatedFirstHalf.id ? updatedFirstHalf : existing)),
        secondHalf,
      ]);
      setSession(updatedSession);
      setEditingItemId(secondHalf.id);
    } catch {
      // Best-effort — the item just stays as one line if this fails.
    } finally {
      setSplittingItemId(null);
    }
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

      {reviewCount > 0 ? (
        <div className="rounded-2xl border border-amber/40 bg-surface p-4">
          <p className="text-sm font-medium text-amber">
            Please review {reviewCount} item{reviewCount === 1 ? "" : "s"}
          </p>
          <p className="mt-1 text-sm text-muted">
            The scan wasn&apos;t fully confident about {reviewCount === 1 ? "this one" : "these"}{" "}
            — tap to check the name and price.
          </p>
        </div>
      ) : null}

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
                onSplit={() => splitItem(item)}
                isSplitting={splittingItemId === item.id}
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
