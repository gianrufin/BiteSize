import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentParticipant } from "@/lib/session/currentParticipant";
import { lockedResponse } from "@/lib/session/locking";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ code: string; itemId: string }> },
) {
  const { code, itemId } = await params;
  const supabase = createServerSupabaseClient();
  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("code", code)
    .single();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (session.status === "locked") {
    return lockedResponse();
  }

  const participant = await getCurrentParticipant(supabase, session);
  if (!participant) {
    return NextResponse.json(
      { error: "Join this bill before claiming items" },
      { status: 403 },
    );
  }

  const { error } = await supabase
    .from("item_claims")
    .delete()
    .eq("item_id", itemId)
    .eq("participant_id", participant.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
