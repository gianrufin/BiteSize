import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getDeviceToken } from "@/lib/session/deviceToken";
import { recomputeSessionTotals } from "@/lib/session/recomputeTotals";
import { mapSessionRow } from "@/lib/mappers";
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

  if ("gcashNumber" in body) {
    const rawGcashNumber =
      typeof body.gcashNumber === "string" ? body.gcashNumber.trim() : "";
    const gcashNumber = rawGcashNumber || null;

    if (gcashNumber && !/^09\d{9}$/.test(gcashNumber.replace(/[\s-]/g, ""))) {
      return NextResponse.json(
        { error: "Enter an 11-digit GCash mobile number, e.g. 09171234567" },
        { status: 400 },
      );
    }

    update.gcash_number = gcashNumber ? gcashNumber.replace(/[\s-]/g, "") : null;
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
