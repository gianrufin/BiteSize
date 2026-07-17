import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateSessionCode } from "@/lib/session/code";
import { getOrCreateDeviceToken } from "@/lib/session/deviceToken";
import { isValidGcashNumber, normalizeGcashNumber } from "@/lib/validation/gcash";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  // Prefilled from the device's saved default (Settings) — invalid or missing just
  // means the bill starts with no GCash number set, not a failed creation.
  const rawGcashNumber =
    typeof body?.gcashNumber === "string" ? body.gcashNumber.trim() : "";
  const gcashNumber =
    rawGcashNumber && isValidGcashNumber(rawGcashNumber)
      ? normalizeGcashNumber(rawGcashNumber)
      : null;

  // Prefilled from the device's saved default QR image (Settings) — this is just
  // a Supabase Storage URL the device already uploaded, not user input to validate.
  const gcashQrUrl = typeof body?.gcashQrUrl === "string" && body.gcashQrUrl.trim()
    ? body.gcashQrUrl.trim()
    : null;

  // Prefilled from the device's last-used choice (Settings/remembered) — an
  // invalid or missing value just falls back to the column's own default.
  const splitMode = body?.splitMode === "even" ? "even" : body?.splitMode === "items" ? "items" : undefined;

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
        gcash_number: gcashNumber,
        gcash_qr_url: gcashQrUrl,
        status: "draft",
        currency: "PHP",
        ...(splitMode ? { split_mode: splitMode } : {}),
      })
      .select("id, code")
      .single();

    if (!error && data) {
      // The payer needs a participants row too, so they can claim their own
      // items through the same claims flow as everyone else (Day 5) instead of
      // being a special case throughout the rest of the app. Stored as "Payer"
      // rather than "You" — this name is what *other* participants see next to
      // shared items, and "You" would misleadingly read as referring to them.
      await supabase.from("participants").insert({
        session_id: data.id,
        name: "Payer",
        device_token: deviceToken,
        is_payer: true,
      });

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
