import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrCreateDeviceToken } from "@/lib/session/deviceToken";
import { createSessionRow } from "@/lib/session/createSession";
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

  const result = await createSessionRow(supabase, deviceToken, {
    name: name || null,
    gcashNumber,
    gcashQrUrl,
    splitMode,
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ code: result.code }, { status: 201 });
}
