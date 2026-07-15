import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getDeviceToken } from "@/lib/session/deviceToken";

export async function PATCH(
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
      { error: "Only the payer can reorder participants" },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const order = Array.isArray(body?.order)
    ? body.order.filter((id: unknown) => typeof id === "string")
    : [];

  if (order.length === 0) {
    return NextResponse.json({ error: "order is required" }, { status: 400 });
  }

  const results = await Promise.all(
    order.map((participantId: string, index: number) =>
      supabase
        .from("participants")
        .update({ position: index })
        .eq("id", participantId)
        .eq("session_id", session.id),
    ),
  );

  const firstError = results.find((r) => r.error);
  if (firstError?.error) {
    return NextResponse.json({ error: firstError.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
