import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateSessionCode } from "@/lib/session/code";
import { getDeviceToken, getOrCreateDeviceToken } from "@/lib/session/deviceToken";
import { mapTripRow } from "@/lib/mappers";

export async function GET() {
  const deviceToken = await getDeviceToken();
  if (!deviceToken) {
    return NextResponse.json({ trips: [] });
  }
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("trips")
    .select("*")
    .eq("organizer_device_token", deviceToken)
    .order("created_at", { ascending: false });

  return NextResponse.json({ trips: (data ?? []).map(mapTripRow) });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const currency = typeof body?.currency === "string" && body.currency ? body.currency : "PHP";

  if (!name) {
    return NextResponse.json({ error: "Give this trip a name" }, { status: 400 });
  }

  const deviceToken = await getOrCreateDeviceToken();
  const supabase = createServerSupabaseClient();

  // Same collision-retry pattern as session codes (api/sessions/route.ts) —
  // the code needs to exist before the row does, to build the share link from.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateSessionCode();
    const { data, error } = await supabase
      .from("trips")
      .insert({
        code,
        name,
        organizer_device_token: deviceToken,
        currency,
        status: "open",
      })
      .select("*")
      .single();

    if (!error && data) {
      return NextResponse.json({ trip: mapTripRow(data) }, { status: 201 });
    }

    if (error && error.code !== "23505") {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json(
    { error: "Could not allocate a trip code, please try again" },
    { status: 500 },
  );
}
