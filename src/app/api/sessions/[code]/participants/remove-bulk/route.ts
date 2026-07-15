import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getDeviceToken } from "@/lib/session/deviceToken";

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
      { error: "Only the payer can remove participants" },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const participantIds = Array.isArray(body?.participantIds)
    ? body.participantIds.filter((id: unknown) => typeof id === "string")
    : [];

  if (participantIds.length === 0) {
    return NextResponse.json({ error: "participantIds is required" }, { status: 400 });
  }

  // The payer can never be removed, even if their own id somehow ends up in
  // a bulk selection — filter it out rather than erroring the whole batch.
  const { error } = await supabase
    .from("participants")
    .delete()
    .eq("session_id", session.id)
    .neq("device_token", session.payer_device_token)
    .in("id", participantIds);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
