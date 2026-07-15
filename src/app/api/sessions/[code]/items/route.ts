import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getDeviceToken } from "@/lib/session/deviceToken";
import { recomputeSessionTotals } from "@/lib/session/recomputeTotals";
import { mapItemRow, mapSessionRow } from "@/lib/mappers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const supabase = createServerSupabaseClient();
  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("code", code)
    .single();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const deviceToken = await getDeviceToken();
  if (deviceToken !== session.payer_device_token) {
    return NextResponse.json(
      { error: "Only the payer can edit items" },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const quantity = Number(body?.quantity) || 1;
  const unitPriceCents = Math.round(Number(body?.unitPriceCents));

  if (!name) {
    return NextResponse.json({ error: "Item name is required" }, { status: 400 });
  }
  if (!Number.isFinite(unitPriceCents) || unitPriceCents < 0) {
    return NextResponse.json(
      { error: "Price must be a positive number" },
      { status: 400 },
    );
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json(
      { error: "Quantity must be a positive number" },
      { status: 400 },
    );
  }

  const totalPriceCents = Math.round(quantity * unitPriceCents);

  const { count: existingItemCount } = await supabase
    .from("items")
    .select("id", { count: "exact", head: true })
    .eq("session_id", session.id);

  const { data: item, error } = await supabase
    .from("items")
    .insert({
      session_id: session.id,
      name,
      quantity,
      unit_price_cents: unitPriceCents,
      total_price_cents: totalPriceCents,
      source: "manual",
      position: existingItemCount ?? 0,
    })
    .select("*")
    .single();

  if (error || !item) {
    return NextResponse.json(
      { error: error?.message ?? "Could not add item" },
      { status: 500 },
    );
  }

  const updatedSession = await recomputeSessionTotals(session.id);

  return NextResponse.json(
    { item: mapItemRow(item), session: mapSessionRow(updatedSession) },
    { status: 201 },
  );
}
