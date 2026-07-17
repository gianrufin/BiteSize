import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrCreateDeviceToken } from "@/lib/session/deviceToken";
import { uploadImageToStorage } from "@/lib/storage/uploadImage";

// Device-scoped counterpart to /api/sessions/[code]/gcash-qr: saves one QR image
// per device (keyed by the device token, not a session) so it can prefill new
// bills instead of being re-uploaded every time. Re-uploading overwrites the same
// storage path (upsert), so there's only ever one live URL per device.
export async function POST(request: Request) {
  const deviceToken = await getOrCreateDeviceToken();
  const supabase = createServerSupabaseClient();

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("qr");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  try {
    const qrUrl = await uploadImageToStorage(
      supabase,
      `gcash-qr/device-${deviceToken}.jpg`,
      file,
    );
    return NextResponse.json({ qrUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not upload the image" },
      { status: 500 },
    );
  }
}
