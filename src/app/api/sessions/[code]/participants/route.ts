import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrCreateDeviceToken } from "@/lib/session/deviceToken";
import { mapParticipantRow } from "@/lib/mappers";

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

  const deviceToken = await getOrCreateDeviceToken();

  if (deviceToken === session.payer_device_token) {
    return NextResponse.json(
      { error: "You created this bill — no need to join it separately." },
      { status: 400 },
    );
  }

  // Re-submitting the join form (refresh, double-tap) shouldn't error — just
  // hand back the participant that already exists for this device.
  const { data: existing } = await supabase
    .from("participants")
    .select("*")
    .eq("session_id", session.id)
    .eq("device_token", deviceToken)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ participant: mapParticipantRow(existing) });
  }

  const body = await request.json().catch(() => ({}));
  const requestedName = typeof body?.name === "string" ? body.name.trim() : "";
  if (!requestedName) {
    return NextResponse.json({ error: "Please enter your name" }, { status: 400 });
  }

  // Two participants can genuinely share a first name — device token is the
  // real identity key, not the name string — but an unqualified duplicate is
  // indistinguishable everywhere the name is displayed (claim chips, the
  // payer's summary). Disambiguate by join order: "Alex", "Alex (2)", ...
  const { data: existingNames } = await supabase
    .from("participants")
    .select("name")
    .eq("session_id", session.id);

  const takenNames = new Set((existingNames ?? []).map((p) => p.name.toLowerCase()));
  let name = requestedName;
  if (takenNames.has(name.toLowerCase())) {
    let suffix = 2;
    while (takenNames.has(`${requestedName} (${suffix})`.toLowerCase())) suffix++;
    name = `${requestedName} (${suffix})`;
  }

  const { data: participant, error } = await supabase
    .from("participants")
    .insert({
      session_id: session.id,
      name,
      device_token: deviceToken,
      is_payer: false,
    })
    .select("*")
    .single();

  if (error || !participant) {
    return NextResponse.json(
      { error: error?.message ?? "Could not join this bill" },
      { status: 500 },
    );
  }

  return NextResponse.json({ participant: mapParticipantRow(participant) }, { status: 201 });
}
