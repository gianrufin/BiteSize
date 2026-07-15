import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getDeviceToken } from "@/lib/session/deviceToken";
import { lockedResponse } from "@/lib/session/locking";
import { mapItemClaimRow } from "@/lib/mappers";

// Payer-only override: assigns (or reassigns) a single item to a specific
// participant, replacing any existing claims on that item. This is how the
// payer corrects a claim without asking the participant to redo it themselves.
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
      { error: "Only the payer can reassign items" },
      { status: 403 },
    );
  }

  if (session.status === "locked") {
    return lockedResponse();
  }

  const body = await request.json().catch(() => ({}));
  const itemId = typeof body?.itemId === "string" ? body.itemId : "";
  const participantId = typeof body?.participantId === "string" ? body.participantId : "";

  if (!itemId || !participantId) {
    return NextResponse.json(
      { error: "itemId and participantId are required" },
      { status: 400 },
    );
  }

  const { data: item } = await supabase
    .from("items")
    .select("id")
    .eq("id", itemId)
    .eq("session_id", session.id)
    .single();
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const { data: participant } = await supabase
    .from("participants")
    .select("id")
    .eq("id", participantId)
    .eq("session_id", session.id)
    .single();
  if (!participant) {
    return NextResponse.json({ error: "Participant not found" }, { status: 404 });
  }

  await supabase.from("item_claims").delete().eq("item_id", itemId);
  await supabase.from("items").update({ is_shared: false }).eq("id", itemId);

  const { data: claim, error } = await supabase
    .from("item_claims")
    .insert({ item_id: itemId, participant_id: participantId })
    .select("*")
    .single();

  if (error || !claim) {
    return NextResponse.json(
      { error: error?.message ?? "Could not assign this item" },
      { status: 500 },
    );
  }

  return NextResponse.json({ claim: mapItemClaimRow(claim) }, { status: 201 });
}
