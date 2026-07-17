import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getDeviceToken } from "@/lib/session/deviceToken";
import { mapTripRow } from "@/lib/mappers";
import { getTripSessionsAndBalances } from "@/lib/session/tripBalances";
import type { Database } from "@/types/database";

type TripUpdate = Database["public"]["Tables"]["trips"]["Update"];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const supabase = createServerSupabaseClient();
  const { data: tripRow } = await supabase.from("trips").select("*").eq("code", code).single();

  if (!tripRow) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  const deviceToken = await getDeviceToken();
  const isOrganizer = deviceToken === tripRow.organizer_device_token;
  const { sessions, people } = await getTripSessionsAndBalances(supabase, tripRow.id);

  return NextResponse.json({
    trip: mapTripRow(tripRow),
    isOrganizer,
    sessions,
    // The combined breakdown is organizer-only, same privacy rule as a single
    // bill's payer view — everyone else just opens the individual bill links.
    people: isOrganizer ? people : [],
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const supabase = createServerSupabaseClient();
  const { data: tripRow } = await supabase.from("trips").select("*").eq("code", code).single();

  if (!tripRow) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  const deviceToken = await getDeviceToken();
  if (deviceToken !== tripRow.organizer_device_token) {
    return NextResponse.json(
      { error: "Only the trip organizer can change this" },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const updates: TripUpdate = {};

  if (typeof body?.name === "string" && body.name.trim()) {
    updates.name = body.name.trim();
  }
  if (body?.status === "settled") {
    updates.status = "settled";
    updates.settled_at = new Date().toISOString();
  } else if (body?.status === "open") {
    updates.status = "open";
    updates.settled_at = null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ trip: mapTripRow(tripRow) });
  }

  const { data: updated, error } = await supabase
    .from("trips")
    .update(updates)
    .eq("id", tripRow.id)
    .select("*")
    .single();

  if (error || !updated) {
    return NextResponse.json(
      { error: error?.message ?? "Could not update trip" },
      { status: 500 },
    );
  }

  return NextResponse.json({ trip: mapTripRow(updated) });
}
