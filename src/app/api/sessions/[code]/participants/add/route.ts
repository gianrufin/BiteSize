import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getDeviceToken } from "@/lib/session/deviceToken";
import { mapParticipantRow } from "@/lib/mappers";
import { resolveUniqueParticipantName } from "@/lib/session/participantNaming";

// Payer-only: adds a participant directly, for someone who isn't going to
// scan the join link themselves (paying cash, not using the app). They get a
// placeholder device token that can never match a real one, so this row
// behaves like any other participant everywhere except nobody can ever "log
// in" as them — the payer manages their share on their behalf.
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
      { error: "Only the payer can add participants" },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const rawName = typeof body?.name === "string" ? body.name.trim() : "";

  const { count: existingCount } = await supabase
    .from("participants")
    .select("id", { count: "exact", head: true })
    .eq("session_id", session.id);

  const position = existingCount ?? 0;
  const requestedName = rawName || `Guest ${position + 1}`;
  const name = await resolveUniqueParticipantName(supabase, session.id, requestedName);

  const { data: participant, error } = await supabase
    .from("participants")
    .insert({
      session_id: session.id,
      name,
      device_token: `guest-${nanoid()}`,
      is_payer: false,
      position,
    })
    .select("*")
    .single();

  if (error || !participant) {
    return NextResponse.json(
      { error: error?.message ?? "Could not add participant" },
      { status: 500 },
    );
  }

  return NextResponse.json({ participant: mapParticipantRow(participant) }, { status: 201 });
}
