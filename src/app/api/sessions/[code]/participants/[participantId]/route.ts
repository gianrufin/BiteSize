import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getDeviceToken } from "@/lib/session/deviceToken";
import { mapParticipantRow } from "@/lib/mappers";

const VALID_STATUSES = ["unpaid", "submitted", "confirmed"] as const;
type PaymentStatusValue = (typeof VALID_STATUSES)[number];

function isPaymentStatus(value: unknown): value is PaymentStatusValue {
  return typeof value === "string" && (VALID_STATUSES as readonly string[]).includes(value);
}

export async function PATCH(
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
  const isPayer = deviceToken === session.payer_device_token;
  const isSelf = deviceToken === participant.device_token;

  if (!isPayer && !isSelf) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const paymentStatus = body?.paymentStatus;

  if (!isPaymentStatus(paymentStatus)) {
    return NextResponse.json(
      { error: "paymentStatus must be 'unpaid', 'submitted', or 'confirmed'" },
      { status: 400 },
    );
  }

  // Only the payer can mark a payment as confirmed — a participant can say
  // "I've paid" but can't confirm receipt on the payer's behalf.
  if (paymentStatus === "confirmed" && !isPayer) {
    return NextResponse.json(
      { error: "Only the payer can confirm a payment" },
      { status: 403 },
    );
  }

  const { data: updated, error } = await supabase
    .from("participants")
    .update({ payment_status: paymentStatus })
    .eq("id", participantId)
    .select("*")
    .single();

  if (error || !updated) {
    return NextResponse.json(
      { error: error?.message ?? "Could not update payment status" },
      { status: 500 },
    );
  }

  return NextResponse.json({ participant: mapParticipantRow(updated) });
}
