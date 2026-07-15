"use client";

import { useEffect, useState } from "react";
import { formatCents } from "@/lib/format";
import { upsertRecentBill } from "@/lib/session/recentBills";
import { ItemForm, type ItemFormValues } from "@/components/ItemForm";
import { ItemRow } from "@/components/ItemRow";
import type { Item } from "@/types";

export interface EditableSessionSummary {
  code: string;
  name: string | null;
  subtotalCents: number;
  grandTotalCents: number;
}

export function ItemEditor({
  session: initialSession,
  items: initialItems,
}: {
  session: EditableSessionSummary;
  items: Item[];
}) {
  const [session, setSession] = useState(initialSession);
  const [items, setItems] = useState(initialItems);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    upsertRecentBill({
      code: session.code,
      name: session.name ?? "New bill",
      date: new Date().toISOString(),
      totalCents: session.grandTotalCents,
      role: "payer",
    });
  }, [session.code, session.name, session.grandTotalCents]);

  async function addItem(values: ItemFormValues) {
    const res = await fetch(`/api/sessions/${session.code}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: values.name,
        quantity: values.quantity,
        unitPriceCents: Math.round(Number(values.priceDollars) * 100),
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
        unitPriceCents: Math.round(Number(values.priceDollars) * 100),
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

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-surface p-4">
        <p className="text-sm text-muted">
          Items {items.length} · Subtotal {formatCents(session.subtotalCents)}
        </p>
        <p className="text-2xl font-semibold text-text">
          {formatCents(session.grandTotalCents)}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {items.map((item) =>
          editingItemId === item.id ? (
            <ItemForm
              key={item.id}
              submitLabel="Save"
              initial={{
                name: item.name,
                quantity: item.quantity,
                priceDollars: (item.unitPriceCents / 100).toFixed(2),
              }}
              onSubmit={(values) => updateItem(item.id, values)}
              onCancel={() => setEditingItemId(null)}
              onDelete={() => deleteItem(item.id)}
            />
          ) : (
            <ItemRow key={item.id} item={item} onEdit={() => setEditingItemId(item.id)} />
          ),
        )}
      </div>

      {isAdding ? (
        <ItemForm
          submitLabel="Add item"
          initial={{ name: "", quantity: 1, priceDollars: "" }}
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
