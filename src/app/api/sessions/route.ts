import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateSessionCode } from "@/lib/session/code";
import { getOrCreateDeviceToken } from "@/lib/session/deviceToken";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  const deviceToken = await getOrCreateDeviceToken();
  const supabase = createServerSupabaseClient();

  // Session codes are generated client-request-side and retried on collision rather
  // than relying on the DB to pick one, since `code` needs to be known before the
  // row exists in order to build the join URL/QR code from the same value.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateSessionCode();
    const { data, error } = await supabase
      .from("sessions")
      .insert({
        code,
        payer_device_token: deviceToken,
        name: name || null,
        status: "draft",
      })
      .select("code")
      .single();

    if (!error && data) {
      return NextResponse.json({ code: data.code }, { status: 201 });
    }

    // Unique violation on `code` — regenerate and retry. Any other error is fatal.
    if (error && error.code !== "23505") {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json(
    { error: "Could not allocate a session code, please try again" },
    { status: 500 },
  );
}
