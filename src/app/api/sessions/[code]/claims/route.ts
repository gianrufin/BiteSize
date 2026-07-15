import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentParticipant } from "@/lib/session/currentParticipant";
import { mapItemClaimRow } from "@/lib/mappers";

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

  const participant = await getCurrentParticipant(supabase, session);
  if (!participant) {
    return NextResponse.json(
      { error: "Join this bill before claiming items" },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const itemId = typeof body?.itemId === "string" ? body.itemId : "";
  const markShared = Boolean(body?.markShared);

  if (!itemId) {
    return NextResponse.json({ error: "itemId is required" }, { status: 400 });
  }

  const { data: item } = await supabase
    .from("items")
    .select("*")
    .eq("id", itemId)
    .eq("session_id", session.id)
    .single();

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const { data: existingClaims } = await supabase
    .from("item_claims")
    .select("participant_id")
    .eq("item_id", itemId);

  const claimantIds = (existingClaims ?? []).map((c) => c.participant_id);

  if (claimantIds.includes(participant.id)) {
    return NextResponse.json(
      { error: "You've already claimed this item" },
      { status: 409 },
    );
  }

  // Non-shared items are exclusive: the first person to claim one locks it for
  // everyone else unless they (or someone) explicitly marks it shared.
  if (claimantIds.length > 0 && !item.is_shared && !markShared) {
    return NextResponse.json(
      { error: "This item is already claimed — mark it as shared to split it" },
      { status: 409 },
    );
  }

  if (markShared && !item.is_shared) {
    await supabase.from("items").update({ is_shared: true }).eq("id", itemId);
  }

  const { data: claim, error } = await supabase
    .from("item_claims")
    .insert({ item_id: itemId, participant_id: participant.id })
    .select("*")
    .single();

  if (error || !claim) {
    return NextResponse.json(
      { error: error?.message ?? "Could not claim this item" },
      { status: 500 },
    );
  }

  return NextResponse.json({ claim: mapItemClaimRow(claim) }, { status: 201 });
}
