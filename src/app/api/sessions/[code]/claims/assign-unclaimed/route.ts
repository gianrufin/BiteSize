import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getDeviceToken } from "@/lib/session/deviceToken";
import { lockedResponse } from "@/lib/session/locking";
import { mapItemClaimRow } from "@/lib/mappers";

// Payer-only bulk action: claims every currently-unclaimed item on the bill
// for one participant in a single tap, instead of assigning them one by one.
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
      { error: "Only the payer can assign items" },
      { status: 403 },
    );
  }

  if (session.status === "locked") {
    return lockedResponse();
  }

  const body = await request.json().catch(() => ({}));
  const participantId = typeof body?.participantId === "string" ? body.participantId : "";
  if (!participantId) {
    return NextResponse.json({ error: "participantId is required" }, { status: 400 });
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

  const { data: items } = await supabase
    .from("items")
    .select("id")
    .eq("session_id", session.id);
  const itemIds = (items ?? []).map((item) => item.id);

  if (itemIds.length === 0) {
    return NextResponse.json({ claims: [] });
  }

  const { data: existingClaims } = await supabase
    .from("item_claims")
    .select("item_id")
    .in("item_id", itemIds);

  const claimedItemIds = new Set((existingClaims ?? []).map((c) => c.item_id));
  const unclaimedItemIds = itemIds.filter((id) => !claimedItemIds.has(id));

  if (unclaimedItemIds.length === 0) {
    return NextResponse.json({ claims: [] });
  }

  const { data: claims, error } = await supabase
    .from("item_claims")
    .insert(unclaimedItemIds.map((itemId) => ({ item_id: itemId, participant_id: participantId })))
    .select("*");

  if (error || !claims) {
    return NextResponse.json(
      { error: error?.message ?? "Could not assign the unclaimed items" },
      { status: 500 },
    );
  }

  return NextResponse.json({ claims: claims.map(mapItemClaimRow) });
}
