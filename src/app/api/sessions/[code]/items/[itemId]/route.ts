import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getDeviceToken } from "@/lib/session/deviceToken";
import { recomputeSessionTotals } from "@/lib/session/recomputeTotals";
import { mapItemRow, mapSessionRow } from "@/lib/mappers";
import { lockedResponse } from "@/lib/session/locking";

async function loadSessionAndVerifyPayer(code: string) {
  const supabase = createServerSupabaseClient();
  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("code", code)
    .single();

  if (!session) {
    return {
      error: NextResponse.json({ error: "Session not found" }, { status: 404 }),
    } as const;
  }

  const deviceToken = await getDeviceToken();
  if (deviceToken !== session.payer_device_token) {
    return {
      error: NextResponse.json(
        { error: "Only the payer can edit items" },
        { status: 403 },
      ),
    } as const;
  }

  if (session.status === "locked") {
    return { error: lockedResponse() } as const;
  }

  return { session, supabase } as const;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ code: string; itemId: string }> },
) {
  const { code, itemId } = await params;
  const result = await loadSessionAndVerifyPayer(code);
  if ("error" in result) return result.error;
  const { session, supabase } = result;

  const { data: existing } = await supabase
    .from("items")
    .select("*")
    .eq("id", itemId)
    .eq("session_id", session.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const name = typeof body?.name === "string" ? body.name.trim() : undefined;
  const quantity =
    body?.quantity !== undefined ? Number(body.quantity) : undefined;
  const unitPriceCents =
    body?.unitPriceCents !== undefined
      ? Math.round(Number(body.unitPriceCents))
      : undefined;

  if (name !== undefined && !name) {
    return NextResponse.json({ error: "Item name is required" }, { status: 400 });
  }
  if (
    unitPriceCents !== undefined &&
    (!Number.isFinite(unitPriceCents) || unitPriceCents < 0)
  ) {
    return NextResponse.json(
      { error: "Price must be a positive number" },
      { status: 400 },
    );
  }
  if (quantity !== undefined && (!Number.isFinite(quantity) || quantity <= 0)) {
    return NextResponse.json(
      { error: "Quantity must be a positive number" },
      { status: 400 },
    );
  }

  const nextQuantity = quantity ?? existing.quantity;
  const nextUnitPriceCents = unitPriceCents ?? existing.unit_price_cents;
  const nextTotalPriceCents = Math.round(nextQuantity * nextUnitPriceCents);

  const { data: item, error } = await supabase
    .from("items")
    .update({
      name: name ?? existing.name,
      quantity: nextQuantity,
      unit_price_cents: nextUnitPriceCents,
      total_price_cents: nextTotalPriceCents,
    })
    .eq("id", itemId)
    .select("*")
    .single();

  if (error || !item) {
    return NextResponse.json(
      { error: error?.message ?? "Could not update item" },
      { status: 500 },
    );
  }

  const updatedSession = await recomputeSessionTotals(session.id);

  return NextResponse.json({
    item: mapItemRow(item),
    session: mapSessionRow(updatedSession),
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ code: string; itemId: string }> },
) {
  const { code, itemId } = await params;
  const result = await loadSessionAndVerifyPayer(code);
  if ("error" in result) return result.error;
  const { session, supabase } = result;

  const { error } = await supabase
    .from("items")
    .delete()
    .eq("id", itemId)
    .eq("session_id", session.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const updatedSession = await recomputeSessionTotals(session.id);

  return NextResponse.json({ session: mapSessionRow(updatedSession) });
}
