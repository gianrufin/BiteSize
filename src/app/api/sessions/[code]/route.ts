import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getDeviceToken } from "@/lib/session/deviceToken";
import { recomputeSessionTotals } from "@/lib/session/recomputeTotals";
import { mapSessionRow } from "@/lib/mappers";
import { isValidGcashNumber, normalizeGcashNumber } from "@/lib/validation/gcash";
import type { Database } from "@/types/database";

type SessionUpdate = Database["public"]["Tables"]["sessions"]["Update"];

function parseNonNegativeCents(value: unknown): number | undefined | null {
  if (value === undefined) return undefined;
  const cents = Math.round(Number(value));
  if (!Number.isFinite(cents) || cents < 0) return null;
  return cents;
}

export async function PATCH(
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
      { error: "Only the payer can edit this bill" },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const update: SessionUpdate = {};
  let touchesCharges = false;

  if ("name" in body) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    update.name = name || null;
  }

  if ("venueName" in body) {
    const venueName = typeof body.venueName === "string" ? body.venueName.trim() : "";
    update.venue_name = venueName || null;
  }

  if ("currency" in body) {
    const currency = typeof body.currency === "string" ? body.currency.trim().toUpperCase() : "";
    if (!/^[A-Z]{3}$/.test(currency)) {
      return NextResponse.json(
        { error: "currency must be a 3-letter ISO code, e.g. PHP" },
        { status: 400 },
      );
    }
    update.currency = currency;
  }

  if ("gcashNumber" in body) {
    const rawGcashNumber =
      typeof body.gcashNumber === "string" ? body.gcashNumber.trim() : "";

    if (rawGcashNumber && !isValidGcashNumber(rawGcashNumber)) {
      return NextResponse.json(
        { error: "Enter an 11-digit GCash mobile number, e.g. 09171234567" },
        { status: 400 },
      );
    }

    update.gcash_number = rawGcashNumber ? normalizeGcashNumber(rawGcashNumber) : null;
  }

  if ("splitMode" in body) {
    if (body.splitMode !== "items" && body.splitMode !== "even") {
      return NextResponse.json(
        { error: "splitMode must be 'items' or 'even'" },
        { status: 400 },
      );
    }
    update.split_mode = body.splitMode;
  }

  if ("roundingPreferenceCents" in body) {
    const rounding = Number(body.roundingPreferenceCents);
    if (![1, 100, 500, 1000].includes(rounding)) {
      return NextResponse.json(
        { error: "roundingPreferenceCents must be 1, 100, 500, or 1000" },
        { status: 400 },
      );
    }
    update.rounding_preference_cents = rounding;
  }

  if ("chargeAllocationMode" in body) {
    if (body.chargeAllocationMode !== "proportional" && body.chargeAllocationMode !== "equal") {
      return NextResponse.json(
        { error: "chargeAllocationMode must be 'proportional' or 'equal'" },
        { status: 400 },
      );
    }
    update.charge_allocation_mode = body.chargeAllocationMode;
    touchesCharges = true;
  }

  const chargeFields = [
    ["taxCents", "tax_cents"],
    ["serviceChargeCents", "service_charge_cents"],
    ["tipCents", "tip_cents"],
    ["discountCents", "discount_cents"],
  ] as const;

  for (const [key, column] of chargeFields) {
    if (!(key in body)) continue;
    const cents = parseNonNegativeCents(body[key]);
    if (cents === null) {
      return NextResponse.json(
        { error: `${key} must be a positive number` },
        { status: 400 },
      );
    }
    update[column] = cents;
    touchesCharges = true;
  }

  const isUnlockingInThisRequest = "locked" in body && body.locked === false;
  if (touchesCharges && session.status === "locked" && !isUnlockingInThisRequest) {
    return NextResponse.json(
      { error: "This bill is locked — unlock it first to change charges" },
      { status: 403 },
    );
  }

  if ("locked" in body) {
    const shouldLock = Boolean(body.locked);
    update.status = shouldLock ? "locked" : "open";
    update.locked_at = shouldLock ? new Date().toISOString() : null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from("sessions")
    .update(update)
    .eq("id", session.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Charges feed directly into grand_total_cents, so recompute it the same way
  // item mutations do rather than trusting the client's math.
  const updated = touchesCharges
    ? await recomputeSessionTotals(session.id)
    : (
        await supabase.from("sessions").select("*").eq("id", session.id).single()
      ).data;

  if (!updated) {
    return NextResponse.json(
      { error: "Could not load the updated bill" },
      { status: 500 },
    );
  }

  return NextResponse.json({ session: mapSessionRow(updated) });
}
