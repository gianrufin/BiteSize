import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getDeviceToken } from "@/lib/session/deviceToken";
import { uploadImageToStorage } from "@/lib/storage/uploadImage";
import { mapSessionRow } from "@/lib/mappers";

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
      { error: "Only the payer can upload a GCash QR code" },
      { status: 403 },
    );
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("qr");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  let qrUrl: string;
  try {
    qrUrl = await uploadImageToStorage(supabase, `gcash-qr/${session.id}.jpg`, file);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not upload the image" },
      { status: 500 },
    );
  }

  const { data: updated, error } = await supabase
    .from("sessions")
    .update({ gcash_qr_url: qrUrl })
    .eq("id", session.id)
    .select("*")
    .single();

  if (error || !updated) {
    return NextResponse.json(
      { error: error?.message ?? "Could not save the QR code" },
      { status: 500 },
    );
  }

  return NextResponse.json({ session: mapSessionRow(updated) });
}
