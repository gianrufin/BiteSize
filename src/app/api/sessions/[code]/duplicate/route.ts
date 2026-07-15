import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateSessionCode } from "@/lib/session/code";
import { getDeviceToken } from "@/lib/session/deviceToken";
import { recomputeSessionTotals } from "@/lib/session/recomputeTotals";

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
      { error: "Only the payer can duplicate this bill" },
      { status: 403 },
    );
  }

  const { data: items } = await supabase
    .from("items")
    .select("*")
    .eq("session_id", session.id)
    .order("position", { ascending: true });

  for (let attempt = 0; attempt < 5; attempt++) {
    const newCode = generateSessionCode();
    const { data: newSession, error } = await supabase
      .from("sessions")
      .insert({
        code: newCode,
        payer_device_token: deviceToken,
        name: session.name,
        venue_name: session.venue_name,
        gcash_number: session.gcash_number,
        gcash_qr_url: session.gcash_qr_url,
        currency: session.currency,
        split_mode: session.split_mode,
        charge_allocation_mode: session.charge_allocation_mode,
        tax_cents: session.tax_cents,
        service_charge_cents: session.service_charge_cents,
        tip_cents: session.tip_cents,
        discount_cents: session.discount_cents,
        status: "draft",
      })
      .select("id, code")
      .single();

    if (error) {
      // Unique violation on `code` — regenerate and retry. Any other error is fatal.
      if (error.code === "23505") continue;
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase.from("participants").insert({
      session_id: newSession.id,
      name: "Payer",
      device_token: deviceToken,
      is_payer: true,
    });

    if (items && items.length > 0) {
      await supabase.from("items").insert(
        items.map((item, index) => ({
          session_id: newSession.id,
          name: item.name,
          quantity: item.quantity,
          unit_price_cents: item.unit_price_cents,
          total_price_cents: item.total_price_cents,
          source: "manual" as const,
          ocr_confidence: null,
          position: index,
        })),
      );
      await recomputeSessionTotals(newSession.id);
    }

    return NextResponse.json({ code: newSession.code }, { status: 201 });
  }

  return NextResponse.json(
    { error: "Could not allocate a session code, please try again" },
    { status: 500 },
  );
}
