import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getDeviceToken } from "@/lib/session/deviceToken";
import { uploadImageToStorage } from "@/lib/storage/uploadImage";
import { mapParticipantRow } from "@/lib/mappers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string; participantId: string }> },
) {
  const { code, participantId } = await params;
  const supabase = createServerSupabaseClient();
  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("code", code)
    .single();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const { data: participant } = await supabase
    .from("participants")
    .select("*")
    .eq("id", participantId)
    .eq("session_id", session.id)
    .single();

  if (!participant) {
    return NextResponse.json({ error: "Participant not found" }, { status: 404 });
  }

  const deviceToken = await getDeviceToken();
  if (deviceToken !== participant.device_token) {
    return NextResponse.json(
      { error: "You can only upload your own payment proof" },
      { status: 403 },
    );
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("proof");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  let proofUrl: string;
  try {
    proofUrl = await uploadImageToStorage(
      supabase,
      `payment-proofs/${session.id}/${participant.id}.jpg`,
      file,
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not upload the image" },
      { status: 500 },
    );
  }

  // Uploading proof implies "I've paid" — but never downgrade a payment the
  // payer already confirmed just because a proof photo got re-uploaded.
  const nextStatus = participant.payment_status === "confirmed" ? "confirmed" : "submitted";

  const { data: updated, error } = await supabase
    .from("participants")
    .update({ payment_proof_url: proofUrl, payment_status: nextStatus })
    .eq("id", participantId)
    .select("*")
    .single();

  if (error || !updated) {
    return NextResponse.json(
      { error: error?.message ?? "Could not save the payment proof" },
      { status: 500 },
    );
  }

  return NextResponse.json({ participant: mapParticipantRow(updated) });
}
