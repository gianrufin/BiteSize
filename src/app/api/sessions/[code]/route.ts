import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getDeviceToken } from "@/lib/session/deviceToken";
import { mapSessionRow } from "@/lib/mappers";

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
      { error: "Only the payer can edit this bill" },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => ({}));

  if (!("gcashNumber" in body)) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const rawGcashNumber = typeof body.gcashNumber === "string" ? body.gcashNumber.trim() : "";
  const gcashNumber = rawGcashNumber || null;

  if (gcashNumber && !/^09\d{9}$/.test(gcashNumber.replace(/[\s-]/g, ""))) {
    return NextResponse.json(
      { error: "Enter an 11-digit GCash mobile number, e.g. 09171234567" },
      { status: 400 },
    );
  }

  const { data: updated, error } = await supabase
    .from("sessions")
    .update({ gcash_number: gcashNumber ? gcashNumber.replace(/[\s-]/g, "") : null })
    .eq("id", session.id)
    .select("*")
    .single();

  if (error || !updated) {
    return NextResponse.json(
      { error: error?.message ?? "Could not update this bill" },
      { status: 500 },
    );
  }

  return NextResponse.json({ session: mapSessionRow(updated) });
}
