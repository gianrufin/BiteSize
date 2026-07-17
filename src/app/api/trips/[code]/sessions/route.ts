import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrCreateDeviceToken } from "@/lib/session/deviceToken";
import { createSessionRow } from "@/lib/session/createSession";

// Creates a new bill already attached to this trip. Whoever creates it becomes
// that bill's own payer (same as any normal bill) — a trip's bills can have
// different payers across the trip (Alex fronts dinner, Jamie fronts the
// AirBnB), which is why this doesn't require the caller to be the organizer.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const supabase = createServerSupabaseClient();
  const { data: tripRow } = await supabase.from("trips").select("*").eq("code", code).single();

  if (!tripRow) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }
  if (tripRow.status === "settled") {
    return NextResponse.json(
      { error: "This trip is already settled" },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  const deviceToken = await getOrCreateDeviceToken();
  const result = await createSessionRow(supabase, deviceToken, {
    name: name || null,
    gcashNumber: null,
    gcashQrUrl: null,
    currency: tripRow.currency,
    tripId: tripRow.id,
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ code: result.code }, { status: 201 });
}
