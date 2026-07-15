import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getDeviceToken } from "@/lib/session/deviceToken";
import { mapParticipantRow } from "@/lib/mappers";
import type { Database } from "@/types/database";

type ParticipantUpdate = Database["public"]["Tables"]["participants"]["Update"];

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
  const update: ParticipantUpdate = {};

  if ("paymentStatus" in body) {
    if (!isPaymentStatus(body.paymentStatus)) {
      return NextResponse.json(
        { error: "paymentStatus must be 'unpaid', 'submitted', or 'confirmed'" },
        { status: 400 },
      );
    }
    // Only the payer can mark a payment as confirmed — a participant can say
    // "I've paid" but can't confirm receipt on the payer's behalf.
    if (body.paymentStatus === "confirmed" && !isPayer) {
      return NextResponse.json(
        { error: "Only the payer can confirm a payment" },
        { status: 403 },
      );
    }
    update.payment_status = body.paymentStatus;
  }

  if ("excludedFromCharges" in body) {
    // Who bears tax/service/tip is the payer's call, not the participant's own.
    if (!isPayer) {
      return NextResponse.json(
        { error: "Only the payer can change who's included in charges" },
        { status: 403 },
      );
    }
    update.excluded_from_charges = Boolean(body.excludedFromCharges);
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data: updated, error } = await supabase
    .from("participants")
    .update(update)
    .eq("id", participantId)
    .select("*")
    .single();

  if (error || !updated) {
    return NextResponse.json(
      { error: error?.message ?? "Could not update participant" },
      { status: 500 },
    );
  }

  return NextResponse.json({ participant: mapParticipantRow(updated) });
}

export async function DELETE(
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

  const deviceToken = await getDeviceToken();
  if (deviceToken !== session.payer_device_token) {
    return NextResponse.json(
      { error: "Only the payer can remove participants" },
      { status: 403 },
    );
  }

  const { data: participant } = await supabase
    .from("participants")
    .select("is_payer")
    .eq("id", participantId)
    .eq("session_id", session.id)
    .single();

  if (!participant) {
    return NextResponse.json({ error: "Participant not found" }, { status: 404 });
  }

  if (participant.is_payer) {
    return NextResponse.json({ error: "Can't remove the payer" }, { status: 400 });
  }

  // item_claims cascades on participant delete — their claimed items become
  // unclaimed (still on the bill, ready to reassign), not lost.
  const { error } = await supabase.from("participants").delete().eq("id", participantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
